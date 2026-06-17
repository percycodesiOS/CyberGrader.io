// GameBash — starter games + board/piece libraries.
// Exposes window.GB_STARTERS, window.GB_BOARDS, window.GB_PIECES.
(function(){
  const lucideIcon = (icon, color) => `https://api.iconify.design/lucide/${icon}.svg?color=${encodeURIComponent(color)}`;
  const svgDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  const checkerboard = (a, b, size=80) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size*2}" height="${size*2}"><rect width="${size*2}" height="${size*2}" fill="${a}"/><rect width="${size}" height="${size}" fill="${b}"/><rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${b}"/></svg>`);
  const trackPattern = () => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200"><rect width="1000" height="200" fill="#1f2937"/><g fill="#374151" stroke="#fbbf24" stroke-width="2">${Array.from({length:9},(_,i)=>`<rect x="${20+i*90}" y="60" width="80" height="80"/>`).join('')}<rect x="830" y="60" width="80" height="80" fill="#dc2626"/></g></svg>`);
  const trivia4Q = () => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#0f172a"/><rect x="20" y="20" width="370" height="270" fill="#1e40af" rx="20"/><rect x="410" y="20" width="370" height="270" fill="#a21caf" rx="20"/><rect x="20" y="310" width="370" height="270" fill="#15803d" rx="20"/><rect x="410" y="310" width="370" height="270" fill="#b45309" rx="20"/><text x="205" y="170" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">A</text><text x="595" y="170" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">B</text><text x="205" y="460" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">C</text><text x="595" y="460" font-family="Arial Black" font-size="80" fill="#fff" text-anchor="middle" opacity="0.25">D</text></svg>`);
  const dungeon = () => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1c1917"/><text x="400" y="320" font-family="serif" font-size="48" font-weight="bold" fill="#44403c" text-anchor="middle" opacity="0.5">DUNGEON</text></svg>`);
  const naval = () => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#0c4a6e"/><g stroke="#7dd3fc" stroke-width="1" opacity="0.5">${Array.from({length:11},(_,i)=>`<line x1="${40+i*72}" y1="40" x2="${40+i*72}" y2="560"/>`).join('')}${Array.from({length:8},(_,i)=>`<line x1="40" y1="${40+i*72}" x2="760" y2="${40+i*72}"/>`).join('')}</g></svg>`);
  const hex = (bg, line) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="104"><rect width="60" height="104" fill="${bg}"/><path d="M30 2 L58 18 L58 50 L30 66 L2 50 L2 18 Z" fill="none" stroke="${line}" stroke-width="1.5"/><path d="M0 54 L30 70 L60 54 L60 86 L30 102 L0 86 Z" fill="none" stroke="${line}" stroke-width="1.5"/></svg>`);
  const dots = (bg, dot, size=60) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><circle cx="${size/2}" cy="${size/2}" r="2" fill="${dot}"/></svg>`);
  const stripes = (a, b) => svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${a}"/><rect width="80" height="40" fill="${b}"/></svg>`);

  const actionCards = [
    {id:'ac0', name:'Attack', description:'Deal 1 damage to any opponent.', count:4},
    {id:'ac1', name:'Shield', description:'Block the next attack against you.', count:4},
    {id:'ac2', name:'Heal', description:'Recover 2 health points.', count:3},
    {id:'ac3', name:'Mega Strike', description:'Deal 3 damage to any opponent.', count:1},
  ];
  const triviaCards = Array.from({length:8},(_,i)=>({id:`tc${i}`, name:`Question ${i+1}`, description:'Edit me with your trivia question and answer.', count:1}));

  window.GB_STARTERS = [
    {id:'blank', name:'Blank Canvas', emoji:'✨', description:'Empty board, no pieces. Build whatever you want from scratch.',
      config:{ board:{width:800,height:600,backgroundColor:'#fafafa',gridSize:40}, pieces:[], cards:[], dice:{enabled:true,count:1,sides:6}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true} }},
    {id:'race', name:'Race to the Finish', emoji:'🏁', description:'Linear track with 4 racers. Roll, move, first across the line wins.',
      config:{ board:{width:1000,height:200,backgroundColor:'#1f2937',gridSize:0,backgroundImage:trackPattern()},
        pieces:[
          {id:'p1',name:'Red Racer',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('car-front','#ef4444'),x:35,y:80,width:50,height:50},
          {id:'p2',name:'Blue Racer',type:'token',color:'#3b82f6',shape:'image',imageUrl:lucideIcon('car-front','#3b82f6'),x:35,y:80,width:50,height:50},
          {id:'p3',name:'Green Racer',type:'token',color:'#22c55e',shape:'image',imageUrl:lucideIcon('car-front','#22c55e'),x:35,y:80,width:50,height:50},
          {id:'p4',name:'Gold Racer',type:'token',color:'#eab308',shape:'image',imageUrl:lucideIcon('car-front','#eab308'),x:35,y:80,width:50,height:50},
        ], cards:[], dice:{enabled:true,count:1,sides:6}, features:{enableDice:true,enableCards:false,enableScores:true,enableTurns:true} }},
    {id:'trivia', name:'Quiz Show', emoji:'❓', description:'Four-quadrant trivia board. Draw a question, move to A/B/C/D, score points.',
      config:{ board:{width:800,height:600,backgroundColor:'#0f172a',gridSize:0,backgroundImage:trivia4Q()},
        pieces:[
          {id:'t1',name:'Player 1',type:'token',color:'#fb7185',shape:'image',imageUrl:lucideIcon('user','#fb7185'),x:100,y:100,width:60,height:60},
          {id:'t2',name:'Player 2',type:'token',color:'#60a5fa',shape:'image',imageUrl:lucideIcon('user','#60a5fa'),x:100,y:100,width:60,height:60},
        ], cards:triviaCards, dice:{enabled:false,count:1,sides:6}, features:{enableDice:false,enableCards:true,enableScores:true,enableTurns:true} }},
    {id:'dungeon', name:'Dungeon Crawl', emoji:'⚔️', description:'Heroes vs monsters with treasure. Action cards and d20s included.',
      config:{ board:{width:800,height:600,backgroundColor:'#1c1917',gridSize:40,backgroundImage:dungeon()},
        pieces:[
          {id:'h1',name:'Hero',type:'token',color:'#22c55e',shape:'image',imageUrl:lucideIcon('swords','#22c55e'),x:80,y:280,width:50,height:50},
          {id:'m1',name:'Monster A',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('skull','#ef4444'),x:400,y:200,width:50,height:50},
          {id:'m2',name:'Monster B',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('bug','#ef4444'),x:500,y:350,width:50,height:50},
          {id:'g1',name:'Treasure',type:'token',color:'#facc15',shape:'image',imageUrl:lucideIcon('gem','#facc15'),x:700,y:280,width:50,height:50},
        ], cards:actionCards, dice:{enabled:true,count:2,sides:20}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true} }},
    {id:'chess', name:'Chess Setup', emoji:'♟️', description:'8×8 checkered grid with pawns pre-placed. Edit to make your own variant.',
      config:{ board:{width:640,height:640,backgroundColor:'#fafafa',gridSize:80,backgroundImage:checkerboard('#fafafa','#737373',80)},
        pieces:(()=>{const ps=[];for(let i=0;i<8;i++){ps.push({id:`bp${i}`,name:'Black Pawn',type:'token',color:'#171717',shape:'image',imageUrl:lucideIcon('crown','#171717'),x:10+i*80,y:90,width:60,height:60});ps.push({id:`wp${i}`,name:'White Pawn',type:'token',color:'#fafafa',shape:'image',imageUrl:lucideIcon('crown','#fafafa'),x:10+i*80,y:490,width:60,height:60});}return ps;})(),
        cards:[], dice:{enabled:false,count:1,sides:6}, features:{enableDice:false,enableCards:false,enableScores:false,enableTurns:true} }},
    {id:'naval', name:'Naval Battle', emoji:'🚢', description:'Coordinate grid for battleship-style games. 4 ships pre-placed.',
      config:{ board:{width:800,height:600,backgroundColor:'#0c4a6e',gridSize:0,backgroundImage:naval()},
        pieces:[
          {id:'sh1',name:'Carrier',type:'token',color:'#fafafa',shape:'image',imageUrl:lucideIcon('ship','#fafafa'),x:100,y:100,width:60,height:60},
          {id:'sh2',name:'Destroyer',type:'token',color:'#facc15',shape:'image',imageUrl:lucideIcon('sailboat','#facc15'),x:200,y:100,width:60,height:60},
          {id:'sh3',name:'Submarine',type:'token',color:'#7dd3fc',shape:'image',imageUrl:lucideIcon('anchor','#7dd3fc'),x:300,y:100,width:60,height:60},
          {id:'sh4',name:'Patrol',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('sailboat','#ef4444'),x:400,y:100,width:60,height:60},
        ], cards:[], dice:{enabled:true,count:2,sides:10}, features:{enableDice:true,enableCards:false,enableScores:true,enableTurns:true} }},
    {id:'hex', name:'Hex Strategy', emoji:'🛡️', description:'Hexagonal map with two team flags. Capture territory.',
      config:{ board:{width:900,height:600,backgroundColor:'#0e7490',gridSize:0,backgroundImage:hex('#0e7490','#7dd3fc')},
        pieces:[
          {id:'hx1',name:'Red Team',type:'token',color:'#ef4444',shape:'image',imageUrl:lucideIcon('flag','#ef4444'),x:80,y:280,width:50,height:50},
          {id:'hx2',name:'Blue Team',type:'token',color:'#3b82f6',shape:'image',imageUrl:lucideIcon('flag','#3b82f6'),x:770,y:280,width:50,height:50},
        ], cards:actionCards, dice:{enabled:true,count:1,sides:6}, features:{enableDice:true,enableCards:true,enableScores:true,enableTurns:true} }},
  ];

  window.GB_BOARDS = [
    {id:'blank-light', name:'Blank (Light)', width:800, height:600, backgroundColor:'#fafafa', gridSize:40},
    {id:'blank-dark',  name:'Blank (Dark)',  width:800, height:600, backgroundColor:'#171717', gridSize:40},
    {id:'chess',  name:'Chess', width:640, height:640, backgroundColor:'#fafafa', gridSize:0, backgroundImage:checkerboard('#fafafa','#737373',80)},
    {id:'race',   name:'Race Track', width:1000, height:200, backgroundColor:'#1f2937', gridSize:0, backgroundImage:trackPattern()},
    {id:'trivia', name:'Quiz Show', width:800, height:600, backgroundColor:'#0f172a', gridSize:0, backgroundImage:trivia4Q()},
    {id:'dungeon',name:'Dungeon', width:800, height:600, backgroundColor:'#1c1917', gridSize:40, backgroundImage:dungeon()},
    {id:'hex',    name:'Hex Map', width:900, height:600, backgroundColor:'#0e7490', gridSize:0, backgroundImage:hex('#0e7490','#7dd3fc')},
    {id:'naval',  name:'Naval Grid', width:800, height:600, backgroundColor:'#0c4a6e', gridSize:0, backgroundImage:naval()},
    {id:'space',  name:'Deep Space', width:1000, height:700, backgroundColor:'#020617', gridSize:50, backgroundImage:dots('#020617','#fafafa',60)},
    {id:'grass',  name:'Grass Field', width:1100, height:650, backgroundColor:'#15803d', gridSize:60, backgroundImage:stripes('#15803d','#166534')},
  ];

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

  // Default rules for every starter, so each game opens with "how to play / how to win"
  const STARTER_RULES = {
    blank:      { howToPlay:'This is a sandbox. Decide your own rules as a group before you start.', howToWin:'You choose! Pick a goal together (first to 10 points is a classic) and the host crowns the winner with the Finish Game button.' },
    race:       { howToPlay:'On your turn, roll the die and move your racer that many squares toward the finish line. Then end your turn.', howToWin:'First racer to reach the FINISH square wins.' },
    trivia:     { howToPlay:'The host asks a question. Move your token to the A, B, C, or D corner you think is right. Correct answers score 1 point (use the scoreboard).', howToWin:'First player to 10 points wins.' },
    dungeon:    { howToPlay:'Heroes take turns moving and rolling the d20 to fight monsters. The host narrates what happens on each roll (10+ is a hit).', howToWin:'The heroes win when they reach the treasure. The monsters win if every hero falls.' },
    chess:      { howToPlay:'Take turns moving one pawn per turn. House rules welcome: capture by landing on an opponent piece.', howToWin:'Capture all of the other side\'s pieces, or be the first to reach the far row.' },
    naval:      { howToPlay:'Place your ships, then take turns calling grid squares. The other captain says hit or miss; track shots with the scoreboard.', howToWin:'Sink the whole enemy fleet first.' },
    hex:        { howToPlay:'On your turn, roll the die and claim that many hexes by moving your flag. Defend your territory.', howToWin:'Control the most hexes when time is up. The host calls the end and crowns the winner.' },
  };
  window.GB_STARTERS.forEach(s=>{ if(STARTER_RULES[s.id]) s.config.rules = STARTER_RULES[s.id]; });

  // Built-in fully-playable games (their own self-contained HTML), surfaced in the lobby.
  window.GB_BUILTINS = [
    {id:'yahtzee', name:'Yahtzee', emoji:'🎲', href:'games/yahtzee.html', tag:'1–6 players', description:'Roll, hold, and fill your scorecard. Full 13-category rules with upper bonus.'},
    {id:'connect-four', name:'Connect Four', emoji:'🔴', href:'games/connect-four.html', tag:'2 players', description:'Drop discs and line up four. Head-to-head, keeps score across rounds.'},
    {id:'tic-tac-toe', name:'Tic-Tac-Toe', emoji:'❌', href:'games/tic-tac-toe.html', tag:'1–2 players', description:'Three in a row. Pass-and-play with a friend, or beat the computer on easy or hard.'},
    {id:'mynecraft', name:'MYnecraft', emoji:'🧱', href:'../game/mynecraft.html', tag:'Solo', description:'A calm 3D blocky world. Build, mine, and explore. Saves where you left off.'},
  ];
})();
