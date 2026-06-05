// GameBash starter games — ported from src/data/presets.ts
// Exposes window.GB_STARTERS (array) used by the lobby's "Make demo games" seeder.

(function(){
  const lucideIcon = (icon, color) =>
    `https://api.iconify.design/lucide/${icon}.svg?color=${encodeURIComponent(color)}`;

  const svgDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  const checkerboard = (a, b, size = 80) => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size*2}" height="${size*2}" viewBox="0 0 ${size*2} ${size*2}"><rect width="${size*2}" height="${size*2}" fill="${a}"/><rect x="0" y="0" width="${size}" height="${size}" fill="${b}"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${b}"/></svg>`);

  const trackPattern = () => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200" viewBox="0 0 1000 200"><rect width="1000" height="200" fill="#1f2937"/><g fill="#374151" stroke="#fbbf24" stroke-width="2">${Array.from({length:9},(_,i)=>`<rect x="${20+i*90}" y="60" width="80" height="80"/>`).join('')}<rect x="830" y="60" width="80" height="80" fill="#dc2626"/></g><text x="60" y="180" font-family="Arial" font-size="14" fill="#fbbf24" text-anchor="middle" font-weight="bold">START</text><text x="870" y="180" font-family="Arial" font-size="14" fill="#dc2626" text-anchor="middle" font-weight="bold">FINISH</text></svg>`);

  const trivia4QPattern = () => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#0f172a"/><rect x="20" y="20" width="370" height="270" fill="#1e40af" rx="20"/><rect x="410" y="20" width="370" height="270" fill="#a21caf" rx="20"/><rect x="20" y="310" width="370" height="270" fill="#15803d" rx="20"/><rect x="410" y="310" width="370" height="270" fill="#b45309" rx="20"/><text x="205" y="170" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">A</text><text x="595" y="170" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">B</text><text x="205" y="460" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">C</text><text x="595" y="460" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">D</text></svg>`);

  const dungeonPattern = () => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#1c1917"/><text x="400" y="320" font-family="serif" font-size="48" font-weight="bold" fill="#44403c" text-anchor="middle" opacity="0.5">DUNGEON</text></svg>`);

  const battleshipPattern = () => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#0c4a6e"/><g stroke="#7dd3fc" stroke-width="1" opacity="0.5">${Array.from({length:11},(_,i)=>`<line x1="${40+i*72}" y1="40" x2="${40+i*72}" y2="560"/>`).join('')}${Array.from({length:8},(_,i)=>`<line x1="40" y1="${40+i*72}" x2="760" y2="${40+i*72}"/>`).join('')}</g></svg>`);

  const hexPattern = (bg, line) => svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="104" viewBox="0 0 60 104"><rect width="60" height="104" fill="${bg}"/><path d="M30 2 L58 18 L58 50 L30 66 L2 50 L2 18 Z" fill="none" stroke="${line}" stroke-width="1.5"/><path d="M0 54 L30 70 L60 54 L60 86 L30 102 L0 86 Z" fill="none" stroke="${line}" stroke-width="1.5"/></svg>`);

  const actionCards = [
    {name:'Attack', description:'Deal 1 damage to any opponent.', count:4},
    {name:'Shield', description:'Block the next attack against you.', count:4},
    {name:'Heal', description:'Recover 2 health points.', count:3},
    {name:'Mega Strike', description:'Deal 3 damage to any opponent.', count:1},
  ].map((c,i)=>({...c, id:`ac${i}`}));

  const triviaCards = Array.from({length:8},(_,i)=>({id:`tc${i}`, name:`Question ${i+1}`, description:'Edit me with your trivia question.', count:1}));

  const TEMPLATE_BLANK = { board:{width:800,height:600,backgroundColor:'#fafafa',gridSize:40}, pieces:[], cards:[], dice:{enabled:true,count:1,sides:6}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true}, assets:[] };

  const TEMPLATE_RACE = { board:{width:1000,height:200,backgroundColor:'#1f2937',gridSize:0,backgroundImage:trackPattern()},
    pieces:[
      {id:'p1',name:'Red Racer',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('car-front','#ef4444'),x:35,y:80,width:50,height:50},
      {id:'p2',name:'Blue Racer',type:'token',color:'#3b82f6',shape:'image',imageUrl:lucideIcon('car-front','#3b82f6'),x:35,y:80,width:50,height:50},
      {id:'p3',name:'Green Racer',type:'token',color:'#22c55e',shape:'image',imageUrl:lucideIcon('car-front','#22c55e'),x:35,y:80,width:50,height:50},
      {id:'p4',name:'Yellow Racer',type:'token',color:'#eab308',shape:'image',imageUrl:lucideIcon('car-front','#eab308'),x:35,y:80,width:50,height:50},
    ], cards:[], dice:{enabled:true,count:1,sides:6,color:'#fbbf24'}, features:{enableDice:true,enableCards:false,enableScores:true,enableTurns:true}, assets:[] };

  const TEMPLATE_TRIVIA = { board:{width:800,height:600,backgroundColor:'#0f172a',gridSize:0,backgroundImage:trivia4QPattern()},
    pieces:[
      {id:'t1',name:'Player 1',type:'token',color:'#fb7185',shape:'image',imageUrl:lucideIcon('user','#fb7185'),x:100,y:100,width:60,height:60},
      {id:'t2',name:'Player 2',type:'token',color:'#60a5fa',shape:'image',imageUrl:lucideIcon('user','#60a5fa'),x:100,y:100,width:60,height:60},
    ], cards:triviaCards, dice:{enabled:false,count:1,sides:6}, features:{enableDice:false,enableCards:true,enableScores:true,enableTurns:true}, assets:[] };

  const TEMPLATE_DUNGEON = { board:{width:800,height:600,backgroundColor:'#1c1917',gridSize:40,backgroundImage:dungeonPattern()},
    pieces:[
      {id:'h1',name:'Hero',type:'token',color:'#22c55e',shape:'image',imageUrl:lucideIcon('swords','#22c55e'),x:80,y:280,width:50,height:50},
      {id:'m1',name:'Monster A',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('skull','#ef4444'),x:400,y:200,width:50,height:50},
      {id:'m2',name:'Monster B',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('bug','#ef4444'),x:500,y:350,width:50,height:50},
      {id:'g1',name:'Treasure',type:'token',color:'#facc15',shape:'image',imageUrl:lucideIcon('gem','#facc15'),x:700,y:280,width:50,height:50},
    ], cards:actionCards, dice:{enabled:true,count:2,sides:20,color:'#dc2626'}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true}, assets:[] };

  const TEMPLATE_CHESS = { board:{width:640,height:640,backgroundColor:'#fafafa',gridSize:80,backgroundImage:checkerboard('#fafafa','#737373',80)},
    pieces:(()=>{const ps=[];for(let i=0;i<8;i++){ps.push({id:`bp${i}`,name:'Black Pawn',type:'token',color:'#171717',shape:'image',imageUrl:lucideIcon('crown','#171717'),x:10+i*80,y:90,width:60,height:60});ps.push({id:`wp${i}`,name:'White Pawn',type:'token',color:'#fafafa',shape:'image',imageUrl:lucideIcon('crown','#fafafa'),x:10+i*80,y:490,width:60,height:60});}return ps;})(),
    cards:[], dice:{enabled:false,count:1,sides:6}, features:{enableDice:false,enableCards:false,enableScores:false,enableTurns:true}, assets:[] };

  const TEMPLATE_BATTLESHIP = { board:{width:800,height:600,backgroundColor:'#0c4a6e',gridSize:0,backgroundImage:battleshipPattern()},
    pieces:[
      {id:'sh1',name:'Carrier',type:'token',color:'#fafafa',shape:'image',imageUrl:lucideIcon('ship','#fafafa'),x:100,y:100,width:60,height:60},
      {id:'sh2',name:'Destroyer',type:'token',color:'#facc15',shape:'image',imageUrl:lucideIcon('sailboat','#facc15'),x:200,y:100,width:60,height:60},
      {id:'sh3',name:'Submarine',type:'token',color:'#7dd3fc',shape:'image',imageUrl:lucideIcon('anchor','#7dd3fc'),x:300,y:100,width:60,height:60},
      {id:'sh4',name:'Patrol Boat',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('sailboat','#ef4444'),x:400,y:100,width:60,height:60},
    ], cards:[], dice:{enabled:true,count:2,sides:10,color:'#0ea5e9'}, features:{enableDice:true,enableCards:false,enableScores:true,enableTurns:true}, assets:[] };

  const TEMPLATE_HEX = { board:{width:900,height:600,backgroundColor:'#0e7490',gridSize:0,backgroundImage:hexPattern('#0e7490','#7dd3fc')},
    pieces:[
      {id:'hex1',name:'Red Team',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('flag','#ef4444'),x:80,y:280,width:50,height:50},
      {id:'hex2',name:'Blue Team',type:'token',color:'#3b82f6',shape:'image',imageUrl:lucideIcon('flag','#3b82f6'),x:770,y:280,width:50,height:50},
    ], cards:actionCards, dice:{enabled:true,count:1,sides:6}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true}, assets:[] };

  window.GB_STARTERS = [
    {id:'blank', name:'Blank Canvas', tagline:'Start from scratch', emoji:'✨', description:'Empty board, no pieces, no cards. Build whatever you want.', config:TEMPLATE_BLANK},
    {id:'race', name:'Race to the Finish', tagline:'First across the line wins', emoji:'🏁', description:'Linear 10-square track with 4 racers. Roll, move, first to the finish wins.', config:TEMPLATE_RACE},
    {id:'trivia', name:'Quiz Show', tagline:'A/B/C/D trivia battle', emoji:'❓', description:'Four-quadrant trivia board. Draw a question, move to A/B/C/D, score points.', config:TEMPLATE_TRIVIA},
    {id:'dungeon', name:'Dungeon Crawl', tagline:'Heroes vs monsters', emoji:'⚔️', description:'Heroes on the left, monsters in the middle, treasure on the right. d20s included.', config:TEMPLATE_DUNGEON},
    {id:'chess', name:'Chess Setup', tagline:'8×8 checkered grid', emoji:'♟️', description:'8×8 board with pawns pre-placed. Edit pieces to make your own variant.', config:TEMPLATE_CHESS},
    {id:'battleship', name:'Naval Battle', tagline:'10×8 grid + ships', emoji:'🚢', description:'Coordinate grid for battleship-style games. 4 ships pre-placed.', config:TEMPLATE_BATTLESHIP},
    {id:'hex', name:'Hex Strategy', tagline:'Territory & tactics', emoji:'🛡️', description:'Hexagonal map with two team flags. Capture territory.', config:TEMPLATE_HEX},
  ];

  // ── board themes (used by the Create-game editor) ──
  const dotsPattern = (bg, dot, size=60) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><circle cx="${size/2}" cy="${size/2}" r="2" fill="${dot}"/></svg>`);
  const stripesPattern = (a, b) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${a}"/><rect y="0" width="80" height="40" fill="${b}"/></svg>`);

  window.GB_BOARDS = [
    {id:'blank-light', name:'Blank (Light)', width:800, height:600, backgroundColor:'#fafafa', gridSize:40},
    {id:'blank-dark',  name:'Blank (Dark)',  width:800, height:600, backgroundColor:'#171717', gridSize:40},
    {id:'chess',  name:'Chess', width:640, height:640, backgroundColor:'#fafafa', gridSize:0, backgroundImage:checkerboard('#fafafa','#737373',80)},
    {id:'race',   name:'Race Track', width:1000, height:200, backgroundColor:'#1f2937', gridSize:0, backgroundImage:trackPattern()},
    {id:'trivia', name:'Quiz Show', width:800, height:600, backgroundColor:'#0f172a', gridSize:0, backgroundImage:trivia4QPattern()},
    {id:'dungeon',name:'Dungeon', width:800, height:600, backgroundColor:'#1c1917', gridSize:40, backgroundImage:dungeonPattern()},
    {id:'hex',    name:'Hex Map', width:900, height:600, backgroundColor:'#0e7490', gridSize:0, backgroundImage:hexPattern('#0e7490','#7dd3fc')},
    {id:'naval',  name:'Naval Grid', width:800, height:600, backgroundColor:'#0c4a6e', gridSize:0, backgroundImage:battleshipPattern()},
    {id:'space',  name:'Deep Space', width:1000, height:700, backgroundColor:'#020617', gridSize:50, backgroundImage:dotsPattern('#020617','#fafafa',60)},
    {id:'grass',  name:'Grass Field', width:1100, height:650, backgroundColor:'#15803d', gridSize:60, backgroundImage:stripesPattern('#15803d','#166534')},
  ];

  // ── piece palette (used by the editor) ──
  window.GB_PIECES = [
    {name:'Red Pawn', color:'#ef4444', shape:'circle'},
    {name:'Blue Pawn', color:'#3b82f6', shape:'circle'},
    {name:'Green Pawn', color:'#22c55e', shape:'circle'},
    {name:'Yellow Pawn', color:'#eab308', shape:'circle'},
    {name:'Purple Pawn', color:'#a855f7', shape:'circle'},
    {name:'Pink Pawn', color:'#ec4899', shape:'circle'},
    {name:'Red Square', color:'#ef4444', shape:'square'},
    {name:'Blue Square', color:'#3b82f6', shape:'square'},
    {name:'Car', color:'#ef4444', shape:'image', imageUrl:lucideIcon('car-front','#ef4444')},
    {name:'Rocket', color:'#f97316', shape:'image', imageUrl:lucideIcon('rocket','#f97316')},
    {name:'Crown', color:'#facc15', shape:'image', imageUrl:lucideIcon('crown','#facc15')},
    {name:'Sword', color:'#22c55e', shape:'image', imageUrl:lucideIcon('swords','#22c55e')},
    {name:'Shield', color:'#3b82f6', shape:'image', imageUrl:lucideIcon('shield','#3b82f6')},
    {name:'Skull', color:'#e5e5e5', shape:'image', imageUrl:lucideIcon('skull','#e5e5e5')},
    {name:'Gem', color:'#22d3ee', shape:'image', imageUrl:lucideIcon('gem','#22d3ee')},
    {name:'Star', color:'#facc15', shape:'image', imageUrl:lucideIcon('star','#facc15')},
    {name:'Heart', color:'#ef4444', shape:'image', imageUrl:lucideIcon('heart','#ef4444')},
    {name:'Flag', color:'#3b82f6', shape:'image', imageUrl:lucideIcon('flag','#3b82f6')},
    {name:'Ship', color:'#fafafa', shape:'image', imageUrl:lucideIcon('ship','#fafafa')},
    {name:'Cat', color:'#f97316', shape:'image', imageUrl:lucideIcon('cat','#f97316')},
    {name:'Dog', color:'#a16207', shape:'image', imageUrl:lucideIcon('dog','#a16207')},
    {name:'Trophy', color:'#facc15', shape:'image', imageUrl:lucideIcon('trophy','#facc15')},
    {name:'Player', color:'#fb7185', shape:'image', imageUrl:lucideIcon('user','#fb7185')},
    {name:'Pizza', color:'#f97316', shape:'image', imageUrl:lucideIcon('pizza','#f97316')},
  ];
})();
