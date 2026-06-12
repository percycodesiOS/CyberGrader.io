// Yahtzee · GameBash — complete, pass-and-play. Vanilla JS, no dependencies.
(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const COLORS = ['#10b981','#3b82f6','#f59e0b','#ec4899','#a855f7','#ef4444'];

  // ── scorecard categories ──
  const UPPER = [
    {key:'ones',   name:'Ones',   sc:'Sum of all 1s', fn:d=>sumOf(d,1)},
    {key:'twos',   name:'Twos',   sc:'Sum of all 2s', fn:d=>sumOf(d,2)},
    {key:'threes', name:'Threes', sc:'Sum of all 3s', fn:d=>sumOf(d,3)},
    {key:'fours',  name:'Fours',  sc:'Sum of all 4s', fn:d=>sumOf(d,4)},
    {key:'fives',  name:'Fives',  sc:'Sum of all 5s', fn:d=>sumOf(d,5)},
    {key:'sixes',  name:'Sixes',  sc:'Sum of all 6s', fn:d=>sumOf(d,6)},
  ];
  const LOWER = [
    {key:'three',  name:'Three of a Kind', sc:'Sum of all dice', fn:d=>ofAKind(d,3)?sum(d):0},
    {key:'four',   name:'Four of a Kind',  sc:'Sum of all dice', fn:d=>ofAKind(d,4)?sum(d):0},
    {key:'full',   name:'Full House',      sc:'25 points',       fn:d=>fullHouse(d)?25:0},
    {key:'smstr',  name:'Small Straight',  sc:'30 points',       fn:d=>straight(d,4)?30:0},
    {key:'lgstr',  name:'Large Straight',  sc:'40 points',       fn:d=>straight(d,5)?40:0},
    {key:'yahtzee',name:'Yahtzee',         sc:'50 points',       fn:d=>ofAKind(d,5)?50:0},
    {key:'chance', name:'Chance',          sc:'Sum of all dice', fn:d=>sum(d)},
  ];
  const ALL = [...UPPER, ...LOWER];

  function sum(d){return d.reduce((a,b)=>a+b,0);}
  function sumOf(d,n){return d.filter(x=>x===n).length*n;}
  function counts(d){const c={};d.forEach(x=>c[x]=(c[x]||0)+1);return c;}
  function ofAKind(d,n){return Object.values(counts(d)).some(v=>v>=n);}
  function fullHouse(d){const v=Object.values(counts(d)).sort();return (v.length===2&&v[0]===2&&v[1]===3)|| v.length===1 /*5 of a kind counts as FH in many rules*/ ? (v.length===1?true:(v[0]===2&&v[1]===3)) : false;}
  function straight(d,len){
    const u=[...new Set(d)].sort((a,b)=>a-b);
    let run=1,best=1;
    for(let i=1;i<u.length;i++){ if(u[i]===u[i-1]+1){run++;best=Math.max(best,run);} else run=1; }
    return best>=len;
  }

  // ── game state ──
  let players = [];      // {name, color, scores:{}, }
  let turn = 0;          // player index
  let dice = [1,1,1,1,1];
  let held = [false,false,false,false,false];
  let rollsLeft = 3;
  let rolledThisTurn = false;

  // ── setup UI ──
  let chosenCount = 2;
  function buildSetup(){
    const seg = $('countSeg'); seg.innerHTML='';
    [1,2,3,4,5,6].forEach(n=>{
      const b=document.createElement('button');
      b.textContent=n; if(n===chosenCount) b.classList.add('on');
      b.onclick=()=>{chosenCount=n; buildSetup();};
      seg.appendChild(b);
    });
    const wrap=$('nameInputs'); 
    const prev = [...wrap.querySelectorAll('input')].map(i=>i.value);
    wrap.innerHTML='';
    for(let i=0;i<chosenCount;i++){
      const row=document.createElement('div'); row.className='pname';
      const dot=document.createElement('span'); dot.className='dot'; dot.style.background=COLORS[i];
      const inp=document.createElement('input'); inp.type='text'; inp.maxLength=14;
      inp.placeholder=`Player ${i+1}`; inp.value=prev[i]||'';
      row.appendChild(dot); row.appendChild(inp); wrap.appendChild(row);
    }
  }

  function startGame(){
    const inputs=[...$('nameInputs').querySelectorAll('input')];
    players = inputs.map((inp,i)=>({
      name: inp.value.trim() || `Player ${i+1}`,
      color: COLORS[i],
      scores: {}
    }));
    turn=0; resetTurn(); $('setup').style.display='none'; $('winScreen').style.display='none';
    $('stage').style.display='flex';
    buildDice(); renderScore(); renderTurn();
  }

  function resetTurn(){ dice=[1,1,1,1,1]; held=[false,false,false,false,false]; rollsLeft=3; rolledThisTurn=false; }

  // ── dice rendering ──
  function buildDice(){
    const row=$('diceRow'); row.innerHTML='';
    for(let i=0;i<5;i++){
      const d=document.createElement('div');
      d.className='die'; d.dataset.v=dice[i]; d.dataset.heldLabel='1';
      d.innerHTML = Array.from({length:9},(_,k)=>`<span class="pip p${k+1}"></span>`).join('');
      d.onclick=()=>toggleHold(i);
      row.appendChild(d);
    }
    paintDice();
  }
  function paintDice(){
    const row=$('diceRow');
    [...row.children].forEach((d,i)=>{
      d.dataset.v=dice[i];
      d.classList.toggle('held',held[i]);
    });
  }
  function toggleHold(i){
    if(!rolledThisTurn || rollsLeft===3) return; // can only hold after a roll
    held[i]=!held[i]; paintDice();
  }

  function roll(){
    if(rollsLeft<=0) return;
    rolledThisTurn=true;
    const row=$('diceRow');
    for(let i=0;i<5;i++){
      if(!held[i]){
        dice[i]=1+Math.floor(Math.random()*6);
        const el=row.children[i];
        el.classList.remove('rolling'); void el.offsetWidth; el.classList.add('rolling');
      }
    }
    rollsLeft--;
    paintDice(); renderScore(); renderTurn();
    $('hint').textContent = rollsLeft>0 ? 'Tap dice to hold them, then roll again — or pick a score.' : 'Last roll done. Pick a category to score.';
  }

  // ── scorecard rendering ──
  function upperSubtotal(p){ return UPPER.reduce((a,c)=> a + (p.scores[c.key]||0), 0); }
  function upperBonus(p){ return upperSubtotal(p) >= 63 ? 35 : 0; }
  function grandTotal(p){
    let t=0; ALL.forEach(c=>{ if(p.scores[c.key]!=null) t+=p.scores[c.key]; });
    return t + upperBonus(p);
  }
  function turnComplete(){ return ALL.every(c=> players.every(p=> p.scores[c.key]!=null)); }
  function playerDone(p){ return ALL.every(c=> p.scores[c.key]!=null); }

  function pick(catKey){
    if(!rolledThisTurn) return;
    const p=players[turn];
    if(p.scores[catKey]!=null) return; // already filled
    const cat=ALL.find(c=>c.key===catKey);
    let val=cat.fn(dice);
    // Yahtzee bonus: extra Yahtzee while yahtzee box already scored 50 → +100 handled simply
    if(catKey!=='yahtzee' && ofAKind(dice,5) && p.scores.yahtzee===50){
      val += 100; // joker bonus
    }
    p.scores[catKey]=val;
    nextTurn();
  }

  function nextTurn(){
    if(players.every(playerDone)){ renderScore(); return endGame(); }
    do{ turn=(turn+1)%players.length; } while(playerDone(players[turn]));
    resetTurn(); paintDice(); renderScore(); renderTurn();
    $('hint').textContent='Press Roll to start your turn.';
  }

  function renderTurn(){
    const p=players[turn];
    $('turnWho').textContent=p.name;
    $('turnDot').style.background=p.color;
    $('rollsLeft').innerHTML = rollsLeft===3 && !rolledThisTurn ? 'Roll <b>1</b> of 3' : `Roll <b>${4-rollsLeft-1+1>3?3:3-rollsLeft+1-1}</b>`;
    // simpler, correct label:
    const used=3-rollsLeft;
    $('rollsLeft').innerHTML = `Rolls left: <b>${rollsLeft}</b>`;
    const btn=$('rollBtn');
    btn.disabled = rollsLeft<=0;
    btn.textContent = rollsLeft===3 ? '🎲 Roll Dice' : '🎲 Roll Again';
  }

  function renderScore(){
    const t=$('scoreTable');
    const activeP = turn;
    let html = '<thead><tr><th class="cat">Category</th>';
    players.forEach((p,i)=>{
      html += `<th><div class="col-head-player ${i===activeP?'active':''}"><span class="chip" style="background:${p.color}"></span>${esc(p.name)}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    const rowFor = (cat)=>{
      let r=`<tr><td class="cat-cell">${cat.name}<span class="sc">${cat.sc}</span></td>`;
      players.forEach((p,i)=>{
        const filled = p.scores[cat.key]!=null;
        const isActive = i===activeP;
        const colCls = isActive?'col-active':'';
        if(filled){
          r+=`<td class="score-cell filled ${colCls}">${p.scores[cat.key]}</td>`;
        }else if(isActive && rolledThisTurn){
          const ghost = cat.fn(dice);
          r+=`<td class="score-cell open ghost active-col ${colCls}" data-cat="${cat.key}" title="Score ${ghost} here">${ghost}</td>`;
        }else{
          r+=`<td class="score-cell open ${colCls}">–</td>`;
        }
      });
      return r+'</tr>';
    };

    UPPER.forEach(c=> html+=rowFor(c));
    // upper subtotal + bonus
    html+='<tr class="subtotal"><td class="cat-cell">Upper subtotal<span class="bonus-track">63+ earns a 35 bonus</span></td>';
    players.forEach(p=>{ html+=`<td>${upperSubtotal(p)}</td>`; });
    html+='</tr>';
    html+='<tr class="subtotal"><td class="cat-cell">Bonus</td>';
    players.forEach(p=>{ const b=upperBonus(p); const need=63-upperSubtotal(p); html+=`<td>${b? '+35' : (need>0?`<span class="bonus-track">${need} to go</span>`:'0')}</td>`; });
    html+='</tr>';

    LOWER.forEach(c=> html+=rowFor(c));

    html+='<tr class="total-row"><td class="cat-cell">Total</td>';
    players.forEach(p=>{ html+=`<td>${grandTotal(p)}</td>`; });
    html+='</tr></tbody>';
    t.innerHTML=html;

    // wire clickable cells
    t.querySelectorAll('.score-cell.open[data-cat]').forEach(td=>{
      td.onclick=()=>pick(td.dataset.cat);
    });
  }

  function endGame(){
    const ranked=[...players].sort((a,b)=>grandTotal(b)-grandTotal(a));
    const medals=['🥇','🥈','🥉','','',''];
    $('winList').innerHTML = ranked.map((p,i)=>`
      <div class="win-row ${i===0?'first':''}">
        <span class="medal">${medals[i]|| (i+1)+'.'}</span>
        <span class="chip" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color}"></span>
        <span class="nm">${esc(p.name)}</span>
        <span class="pts">${grandTotal(p)}</span>
      </div>`).join('');
    $('winScreen').style.display='flex';
    confetti();
  }

  function confetti(){
    const cols=['#10b981','#34d399','#fbbf24','#3b82f6','#ec4899','#fff'];
    for(let i=0;i<80;i++){
      const c=document.createElement('div'); c.className='confetti';
      c.style.left=Math.random()*100+'vw';
      c.style.background=cols[i%cols.length];
      c.style.animation=`fall ${1.6+Math.random()*1.8}s linear ${Math.random()*0.6}s forwards`;
      document.body.appendChild(c);
      setTimeout(()=>c.remove(),4200);
    }
  }

  function esc(s){return (s+'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

  // ── wire ──
  $('rollBtn').onclick=roll;
  $('startBtn').onclick=startGame;
  $('againBtn').onclick=()=>{ players.forEach(p=>p.scores={}); turn=0; resetTurn(); $('winScreen').style.display='none'; buildDice(); renderScore(); renderTurn(); $('hint').textContent='Press Roll to start your turn.'; };
  buildSetup();
})();
