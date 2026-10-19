/* Peaceful resource-building progression. No DOM, timers, storage, or world mutation. */
(function (root) {
  'use strict';
  const VERSION = 1, LIMIT = 1000000, SCAN_LIMIT = 20000;
  const WOODS = ['wood', 'cherrywood', 'sprucewood', 'pinewood'];
  const CONCRETES = ['concrete', 'whiteconcrete', 'redconcrete', 'yellowconcrete', 'blueconcrete'];
  const BLOCKS = ['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves', 'planks', 'brick', 'snow', 'glow', 'glass', 'water', 'orange', 'blue', 'cherrywood', 'sprucewood', 'pinewood', 'concrete', 'copperore', 'ironore', 'cherryplanks', 'spruceplanks', 'pineplanks', 'cherryleaves', 'whiteconcrete', 'redconcrete', 'yellowconcrete', 'blueconcrete'];
  const INITIAL_BLOCKS = ['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves', 'planks', 'water'];
  const CHARACTERS = ['macek', 'micco', 'eriksen', 'mullet', 'wingenbach', 'mcmichael'];
  const QUESTS = [
    { id: 'wood', title: 'Make a building tool', instruction: 'Collect 10 logs from trees. Craft a building axe.', character: 'micco', blocks: ['cherrywood', 'cherryplanks', 'cherryleaves'], animals: [], goal: 10 },
    { id: 'stone', title: 'Start a stone collection', instruction: 'Craft a building pick. Mine 8 stone blocks.', character: 'eriksen', blocks: ['sprucewood', 'spruceplanks', 'copperore', 'ironore'], animals: [], goal: 8 },
    { id: 'house', title: 'Build your first house', instruction: 'Build a 5 by 5 floor, walls 3 blocks high, and a full roof. Leave one door gap 1 block wide and 2 blocks high.', character: 'mullet', blocks: ['pinewood', 'pineplanks', ...CONCRETES, 'glass', 'brick', 'orange', 'blue'], animals: ['cat'], goal: 1 },
    { id: 'workshop', title: 'Build your workshop collection', instruction: 'Mine 6 copper ore and 4 iron ore. Craft 4 concrete blocks in any color.', character: 'wingenbach', blocks: ['glow', 'snow'], animals: ['horse', 'sheep', 'cow'], goal: 14 },
    { id: 'habitat', title: 'Build a home for fish', instruction: 'Build a 2 by 2 pond or glass tank. Place all 4 water blocks. Give it a solid floor and sides.', character: 'mcmichael', blocks: [], animals: ['fish'], goal: 1 }
  ];
  const RECIPES = {
    axe: { name: 'Building axe', costs: { wood: 3 }, tool: 'axe' },
    pick: { name: 'Building pick', costs: { wood: 2, planks: 2 }, tool: 'pick' },
    planks: { name: '4 planks', costs: { wood: 1 }, output: { planks: 4 } },
    cherryplanks: { name: '4 cherry planks', costs: { cherrywood: 1 }, output: { cherryplanks: 4 }, after: 'wood' },
    spruceplanks: { name: '4 spruce planks', costs: { sprucewood: 1 }, output: { spruceplanks: 4 }, after: 'stone' },
    pineplanks: { name: '4 pine planks', costs: { pinewood: 1 }, output: { pineplanks: 4 }, after: 'house' },
    concrete: { name: '4 concrete', costs: { stone: 2, sand: 2 }, output: { concrete: 4 }, after: 'house' },
    whiteconcrete: { name: '4 white concrete', costs: { stone: 2, sand: 2 }, output: { whiteconcrete: 4 }, after: 'house' },
    redconcrete: { name: '4 red concrete', costs: { stone: 2, sand: 2 }, output: { redconcrete: 4 }, after: 'house' },
    yellowconcrete: { name: '4 yellow concrete', costs: { stone: 2, sand: 2 }, output: { yellowconcrete: 4 }, after: 'house' },
    blueconcrete: { name: '4 blue concrete', costs: { stone: 2, sand: 2 }, output: { blueconcrete: 4 }, after: 'house' },
    glass: { name: '2 glass', costs: { sand: 2 }, output: { glass: 2 }, after: 'house' }
  };
  const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const count = value => Number.isSafeInteger(value) && value > 0 ? Math.min(LIMIT, value) : 0;
  const counts = value => Object.fromEntries(BLOCKS.map(key => [key, count(plain(value) ? value[key] : 0)]));
  const totalWood = counts => WOODS.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const totalConcrete = counts => CONCRETES.reduce((sum, key) => sum + (counts[key] || 0), 0);
  function normalize(raw) {
    raw = plain(raw) ? raw : {};
    const state = { version: VERSION, tools: { axe: raw.tools?.axe === true, pick: raw.tools?.pick === true }, collected: counts(raw.collected), placed: counts(raw.placed), crafted: counts(raw.crafted), completed: [] };
    // Saves can retain past achievements after a building is changed. Unknown, skipped,
    // or reordered quests never grant unlocks; supplied unlock lists are ignored.
    const completed = Array.isArray(raw.completed) ? raw.completed : [];
    for (let i = 0; i < QUESTS.length; i++) {
      if (completed[i] !== QUESTS[i].id) break;
      if (i === 0 && (!state.tools.axe || totalWood(state.collected) < 10)) break;
      if (i === 1 && (!state.tools.pick || state.collected.stone < 8)) break;
      if (i === 3 && (state.collected.copperore < 6 || state.collected.ironore < 4 || totalConcrete(state.crafted) < 4)) break;
      state.completed.push(QUESTS[i].id);
    }
    state.unlocks = { blocks: INITIAL_BLOCKS.slice(), animals: ['dog'], characters: [CHARACTERS[0]] };
    for (const quest of QUESTS.slice(0, state.completed.length)) {
      state.unlocks.blocks.push(...quest.blocks); state.unlocks.animals.push(...quest.animals); state.unlocks.characters.push(quest.character);
    }
    return state;
  }
  function canUseBlock(raw, block) { return normalize(raw).unlocks.blocks.includes(block); }
  function canMine(raw, block) {
    const state = normalize(raw);
    if (!state.unlocks.blocks.includes(block)) return false;
    if (['stone', 'copperore', 'ironore', 'brick', ...CONCRETES].includes(block)) return state.tools.pick;
    if (WOODS.includes(block) && block !== 'wood') return state.tools.axe;
    return true;
  }
  function isCharacterUnlocked(raw, id) { return normalize(raw).unlocks.characters.includes(id); }
  function craft(raw, inventory, recipeId) {
    const state = normalize(raw), nextInventory = counts(inventory), recipe = Object.prototype.hasOwnProperty.call(RECIPES, recipeId) ? RECIPES[recipeId] : null;
    const fail = message => ({ ok: false, state, inventory: nextInventory, message });
    if (!recipe) return fail('Choose a building recipe.');
    if (recipe.after && !state.completed.includes(recipe.after)) return fail('Finish "' + QUESTS.find(quest => quest.id === recipe.after).title + '" to unlock this recipe.');
    if (recipe.tool && state.tools[recipe.tool]) return fail('You already have this building tool.');
    if (Object.entries(recipe.costs).some(([key, amount]) => nextInventory[key] < amount)) return fail('Collect the materials shown in this recipe first.');
    for (const [key, amount] of Object.entries(recipe.costs)) nextInventory[key] -= amount;
    if (recipe.tool) state.tools[recipe.tool] = true;
    for (const [key, amount] of Object.entries(recipe.output || {})) {
      nextInventory[key] = Math.min(LIMIT, nextInventory[key] + amount);
      state.crafted[key] = Math.min(LIMIT, state.crafted[key] + amount);
    }
    return { ok: true, state: normalize(state), inventory: nextInventory, message: 'Made ' + recipe.name.toLowerCase() + '.' };
  }
  function recordMine(raw, block, options) {
    const state = normalize(raw);
    // Repeatedly breaking and replacing one block cannot earn gathering rewards.
    if (canMine(state, block) && options?.natural === true) state.collected[block] = Math.min(LIMIT, state.collected[block] + 1);
    return state;
  }
  function recordPlace(raw, block) {
    const state = normalize(raw);
    if (state.unlocks.blocks.includes(block)) state.placed[block] = Math.min(LIMIT, state.placed[block] + 1);
    return state;
  }
  const key = (x, y, z) => x + ',' + y + ',' + z;
  const material = block => BLOCKS.includes(block) && !['water', 'leaves', 'cherryleaves', 'snow'].includes(block);
  const isMap = edits => Object.prototype.toString.call(edits) === '[object Map]';
  const getEdit = (edits, id) => isMap(edits) ? edits.get(id) : plain(edits) && Object.prototype.hasOwnProperty.call(edits, id) ? edits[id] : undefined;
  const ownBlock = (getBlock, edits, x, y, z) => material(getBlock(x, y, z)) && getEdit(edits, key(x, y, z)) === getBlock(x, y, z);
  function anchors(edits, predicate) {
    const found = [], iterator = isMap(edits) ? edits.entries() : Object.entries(plain(edits) ? edits : {});
    let seen = 0;
    // A bounded backwards scan favors the student's latest building over old edits.
    const entries = Array.isArray(iterator) ? iterator : Array.from(iterator);
    for (let i = entries.length - 1; i >= 0 && seen < SCAN_LIMIT; i--, seen++) {
      const [id, block] = entries[i];
      if (!predicate(block) || !/^-?\d+,-?\d+,-?\d+$/.test(id)) continue;
      const xyz = id.split(',').map(Number);
      if (xyz.every(n => Number.isSafeInteger(n) && Math.abs(n) <= 10000)) found.push(xyz);
    }
    return found;
  }
  function inspectHouse(getBlock, edits) {
    if (typeof getBlock !== 'function') return { valid: false };
    let calls = 0;
    const read = (x, y, z) => ++calls <= 150000 ? getBlock(x, y, z) : undefined;
    for (const [x, y, z] of anchors(edits, material)) {
      if (calls > 150000) break;
      // Fixed classroom blueprint: 5x5 foundation, 3-high walls, roof at y+4.
      if (!ownBlock(read, edits, x + 4, y, z + 4) || !ownBlock(read, edits, x + 2, y + 4, z + 2)) continue;
      let valid = true;
      for (let dx = 0; dx < 5 && valid; dx++) for (let dz = 0; dz < 5; dz++) {
        if (!ownBlock(read, edits, x + dx, y, z + dz) || !ownBlock(read, edits, x + dx, y + 4, z + dz)) { valid = false; break; }
      }
      if (!valid) continue;
      let doors = 0;
      for (let dx = 0; dx < 5 && valid; dx++) for (let dz = 0; dz < 5; dz++) {
        const edge = dx === 0 || dx === 4 || dz === 0 || dz === 4;
        if (!edge) {
          if (read(x + dx, y + 1, z + dz) || read(x + dx, y + 2, z + dz)) { valid = false; break; }
          continue;
        }
        const corner = (dx === 0 || dx === 4) && (dz === 0 || dz === 4);
        const lower = ownBlock(read, edits, x + dx, y + 1, z + dz), upper = ownBlock(read, edits, x + dx, y + 2, z + dz);
        if (!ownBlock(read, edits, x + dx, y + 3, z + dz)) { valid = false; break; }
        if (!lower || !upper) {
          if (corner || lower || upper || read(x + dx, y + 1, z + dz) || read(x + dx, y + 2, z + dz)) { valid = false; break; }
          doors++;
        }
      }
      if (valid && doors === 1) return { valid: true, origin: { x, y, z }, width: 5, depth: 5, height: 5, doors };
    }
    return { valid: false };
  }
  function inspectHabitat(getBlock, edits) {
    if (typeof getBlock !== 'function') return { valid: false };
    for (const [x, y, z] of anchors(edits, block => block === 'water')) {
      let valid = true, glass = false;
      for (let dx = 0; dx < 2 && valid; dx++) for (let dz = 0; dz < 2; dz++) {
        if (getBlock(x + dx, y, z + dz) !== 'water' || getEdit(edits, key(x + dx, y, z + dz)) !== 'water' || !ownBlock(getBlock, edits, x + dx, y - 1, z + dz)) { valid = false; break; }
      }
      if (!valid) continue;
      for (let n = 0; n < 2 && valid; n++) for (const [bx, bz] of [[x - 1, z + n], [x + 2, z + n], [x + n, z - 1], [x + n, z + 2]]) {
        if (!ownBlock(getBlock, edits, bx, y, bz)) { valid = false; break; }
        if (getBlock(bx, y, bz) === 'glass') glass = true;
      }
      if (valid) return { valid: true, kind: glass ? 'tank' : 'pond', origin: { x, y, z }, water: 4 };
    }
    return { valid: false };
  }
  function canPlaceAnimal(raw, type, getBlock, x, y, z) {
    if (!normalize(raw).unlocks.animals.includes(type) || typeof getBlock !== 'function') return false;
    if (![x, y, z].every(Number.isInteger)) return false;
    if (type === 'fish') return getBlock(x, y, z) === 'water';
    return !getBlock(x, y, z) && material(getBlock(x, y - 1, z));
  }
  function progress(state, id) {
    if (state.completed.includes(id)) return QUESTS.find(q => q.id === id).goal;
    if (id === 'wood') return Math.min(10, totalWood(state.collected));
    if (id === 'stone') return Math.min(8, state.collected.stone);
    if (id === 'workshop') return Math.min(6, state.collected.copperore) + Math.min(4, state.collected.ironore) + Math.min(4, totalConcrete(state.crafted));
    return 0;
  }
  function status(raw) {
    const state = normalize(raw), quests = QUESTS.map(q => ({ ...q, done: state.completed.includes(q.id), progress: progress(state, q.id) }));
    return { complete: state.completed.length === QUESTS.length, next: quests.find(q => !q.done) || null, quests, unlocks: state.unlocks };
  }
  function advance(raw, world) {
    let state = normalize(raw);
    const newlyCompleted = [], rewards = [];
    for (const quest of QUESTS.slice(state.completed.length)) {
      let complete = false;
      if (quest.id === 'wood') complete = totalWood(state.collected) >= 10 && state.tools.axe;
      if (quest.id === 'stone') complete = state.collected.stone >= 8 && state.tools.pick;
      if (quest.id === 'house') complete = inspectHouse(world?.getBlock, world?.edits).valid;
      if (quest.id === 'workshop') complete = state.collected.copperore >= 6 && state.collected.ironore >= 4 && totalConcrete(state.crafted) >= 4;
      if (quest.id === 'habitat') complete = inspectHabitat(world?.getBlock, world?.edits).valid;
      if (!complete) break;
      state.completed.push(quest.id); newlyCompleted.push(quest.id);
      rewards.push({ quest: quest.id, character: quest.character, blocks: quest.blocks.slice(), animals: quest.animals.slice() });
      state = normalize(state);
    }
    return { state, newlyCompleted, rewards };
  }
  root.MYNE_HARDCORE = Object.freeze({ VERSION, BLOCKS: Object.freeze(BLOCKS), CHARACTERS: Object.freeze(CHARACTERS), RECIPES, QUESTS, normalize, craft, recordMine, recordPlace, canUseBlock, canMine, isCharacterUnlocked, canPlaceAnimal, inspectHouse, inspectHabitat, advance, status });
})(globalThis);
