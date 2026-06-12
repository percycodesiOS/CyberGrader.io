// Connect Four · GameBash — pass-and-play, full win detection. Vanilla JS.
(function(){
  "use strict";
  const $ = id=>document.getElementById(id);
  const ROWS=6, COLS=7;
  let grid, current, names, wins, gameOver;

  function init(){
    grid = Array.from({length:ROWS},()=>Array(COLS).fill(0)); // 0 empty, 1 red, 2 yellow
    current = 1; gameOver=false;
    buildBoard(); renderTurn();
  }

  function start(){
    names = { 1: ($('p1').value.trim()||'Red'), 2: ($('p2').value.trim()||'Yellow') };
    wins = {1:0,2:0};
    $('setup').classList.remove('show');
    $('stage').style.display='flex';
    init(); renderScore();
  }

  function buildBoard(){
    const cols=$('cols'); cols.innerHTML='';
    for(let c=0;c<COLS;c++){
      const col=document.createElement('div'); col.className='col'; col.dataset.c=c;
      for(let r=0;r<ROWS;r++){
        const cell=document.createElement('div'); cell.className='cell'; cell.dataset.r=r; cell.dataset.c=c;
        cell.innerHTML='<span class="token"></span>';
        col.appendChild(cell);
      }
      col.onclick=()=>drop(c);
      cols.appendChild(col);
    }
  }

  function lowestEmpty(c){ for(let r=ROWS-1;r>=0;r--){ if(grid[r][c]===0) return r; } return -1; }

  function drop(c){
    if(gameOver) return;
    const r=lowestEmpty(c);
    if(r<0){ return; }
    grid[r][c]=current;
    const cell=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    cell.classList.add(current===1?'red':'yellow');
    if(lowestEmpty(c)<0) $(`cols`).children[c].classList.add('full');

    const line=winningLine(r,c,current);
    if(line){ return finishWin(line); }
    if(grid.every(row=>row.every(v=>v!==0))) return finishDraw();
    current = current===1?2:1;
    renderTurn();
  }

  // check all 4 directions through the placed disc
  function winningLine(r,c,p){
    const dirs=[[0,1],[1,0],[1,1],[1,-1]];
    for(const [dr,dc] of dirs){
      const line=[[r,c]];
      for(let s=1;s<4;s++){ const nr=r+dr*s,nc=c+dc*s; if(inb(nr,nc)&&grid[nr][nc]===p) line.push([nr,nc]); else break; }
      for(let s=1;s<4;s++){ const nr=r-dr*s,nc=c-dc*s; if(inb(nr,nc)&&grid[nr][nc]===p) line.unshift([nr,nc]); else break; }
      if(line.length>=4) return line.slice(0,4).length>=4?line:line;
    }
    return null;
  }
  function inb(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS;}

  function finishWin(line){
    gameOver=true;
    line.forEach(([r,c])=>document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`).classList.add('win'));
    wins[current]++; renderScore();
    setTimeout(()=>{
      const isRed=current===1;
      $('winDisc').style.background = isRed?'radial-gradient(circle at 35% 30%,#ff7b7b,#ef4444)':'radial-gradient(circle at 35% 30%,#ffe08a,#fbbf24)';
      $('winTitle').textContent = `${names[current]} wins!`;
      $('winSub').textContent = 'Four in a row. 🎉';
      $('againBtn').textContent='Next Round';
      $('winScreen').classList.add('show');
      confetti();
    }, 700);
  }
  function finishDraw(){
    gameOver=true;
    $('winDisc').style.background='var(--panel2)';
    $('winTitle').textContent="It's a draw!";
    $('winSub').textContent='Board is full. Run it back?';
    $('againBtn').textContent='New Round';
    $('winScreen').classList.add('show');
  }

  function renderTurn(){
    const isRed=current===1;
    $('turnDisc').className='disc '+(isRed?'red':'yellow');
    $('turnWho').textContent=names[current];
  }
  function renderScore(){
    $('scoreBar').innerHTML=`
      <span class="s"><span class="disc" style="background:radial-gradient(circle at 35% 30%,#ff7b7b,#ef4444)"></span>${esc(names[1])}: <b style="color:#fff">${wins[1]}</b></span>
      <span class="s"><span class="disc" style="background:radial-gradient(circle at 35% 30%,#ffe08a,#fbbf24)"></span>${esc(names[2])}: <b style="color:#fff">${wins[2]}</b></span>`;
  }

  function confetti(){
    const cols=['#10b981','#fbbf24','#ef4444','#3b82f6','#fff'];
    for(let i=0;i<70;i++){const c=document.createElement('div');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=cols[i%cols.length];c.style.animation=`fall ${1.5+Math.random()*1.7}s linear ${Math.random()*.5}s forwards`;document.body.appendChild(c);setTimeout(()=>c.remove(),4000);}
  }
  function esc(s){return (s+'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

  $('startBtn').onclick=start;
  $('newRoundBtn').onclick=()=>{ current = current===1?2:1; /*loser/alternate starts*/ init(); };
  $('resetBtn').onclick=()=>{ wins={1:0,2:0}; renderScore(); init(); };
  $('againBtn').onclick=()=>{ $('winScreen').classList.remove('show'); const starter = current===1?2:1; init(); current=starter; renderTurn(); };
})();
