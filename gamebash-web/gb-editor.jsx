// GameBash — build-your-own-game editor. Exposes window.GBEditor.
// Steps: 1 Name · 2 Board · 3 Pieces (incl. uploaded artwork) · 4 Rules (how to play / win) · 5 Save.
// Students save as 'pending' (teacher approves); teacher games publish instantly.
(function(){
  const { useState, useMemo, useRef, useEffect } = React;

  // Resize an uploaded image to a small square data URL (keeps Firestore docs tiny)
  function fileToArt(file, cb){
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const S = 96, c = document.createElement('canvas');
      c.width = S; c.height = S;
      const ctx = c.getContext('2d');
      const r = Math.max(S/img.width, S/img.height);
      const w = img.width*r, h = img.height*r;
      ctx.drawImage(img, (S-w)/2, (S-h)/2, w, h);
      let dataUrl = c.toDataURL('image/png');
      if(dataUrl.length > 36000) dataUrl = c.toDataURL('image/jpeg', .82);
      URL.revokeObjectURL(url);
      cb(dataUrl);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function GuideModal({ onClose }){
    const steps = [
      ['1. Pick your game type', 'Board game (pieces on a board), Card game (a deck players draw from), or Dice game (roll and score). You get every tool either way – this just sets up the right starting point.'],
      ['2. Name it', 'Type a name at the top. Example: "Math Race" or "Trivia Battle".'],
      ['3. Pick a board', 'Open the BOARD tab and tap a background. This is the table your game is played on.'],
      ['4. Add pieces and cards', 'PIECES: click pieces to drop them on the board, drag each to its starting spot. CARDS: write the cards for your deck (questions, actions, challenges) – players draw them during the game.'],
      ['5. Add your own artwork', 'In the ARTWORK tab, upload a picture (a drawing, a photo, anything). It becomes a piece you can place just like the built-in ones.'],
      ['6. Set the dice', 'In the DICE tab, choose how many dice and how many sides (or turn dice off for games that do not need them).'],
      ['7. Write the rules', 'In the RULES tab, fill in "How to play" (what players do on a turn) and "How to win" (how the game ENDS). Every game needs an ending... first to the finish line, first to 10 points, last one standing.'],
      ['8. Save and play', 'Hit Save. Teacher games go live instantly; student games go to the teacher for approval. Then press Play in the lobby – friends join from their own devices, the rules pop up, and the host crowns the winner with Finish Game.'],
    ];
    return (
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div onClick={e=>e.stopPropagation()} className="scroll" style={{maxWidth:560,width:'100%',maxHeight:'86vh',overflow:'auto',background:'var(--panel)',border:'1px solid rgba(16,185,129,.35)',borderRadius:20,padding:'26px 28px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <h2 style={{color:'#fff',fontSize:'1.3rem',fontWeight:800}}>How to build a game</h2>
            <button onClick={onClose} style={{background:'none',border:0,color:'var(--muted)',fontSize:'1.1rem',cursor:'pointer'}}>✕</button>
          </div>
          <p style={{color:'var(--muted)',fontSize:'.86rem',marginBottom:16}}>From blank board to playable game, start to finish:</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {steps.map(([t,d])=>(
              <div key={t} style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--line)',borderRadius:12,padding:'12px 14px'}}>
                <div style={{color:'var(--emerald-bright)',fontWeight:800,fontSize:'.92rem',marginBottom:3}}>{t}</div>
                <div style={{color:'var(--text)',fontSize:'.85rem',lineHeight:1.55}}>{d}</div>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{marginTop:18,width:'100%',background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'12px',borderRadius:12,border:0,cursor:'pointer',fontSize:'.95rem'}}>Got it, let's build</button>
        </div>
      </div>
    );
  }
  window.GBGuideModal = GuideModal;

  function GBEditor({ profile, isAdmin, existing, onClose }){
    const I = window.GBIcon;
    const BOARDS = window.GB_BOARDS || [];
    const PALETTE = window.GB_PIECES || [];
    const editing = !!existing;

    const startBoard = useMemo(()=>{
      if(existing?.config?.board){
        const b = existing.config.board;
        const match = BOARDS.find(x=>x.backgroundImage===b.backgroundImage && x.backgroundColor===b.backgroundColor);
        return match || { id:'custom', name:'Custom', ...b };
      }
      return BOARDS[0];
    }, []);

    const [name, setName] = useState(existing?.name || '');
    const [gameType, setGameType] = useState(existing ? (existing.config?.gameType || 'board') : null);
    const [board, setBoard] = useState(startBoard);
    const [pieces, setPieces] = useState(existing?.config?.pieces ? existing.config.pieces.map(p=>({...p})) : []);
    const [cards, setCards] = useState(existing?.config?.cards ? existing.config.cards.map(c=>({...c})) : []);
    const [artwork, setArtwork] = useState(existing?.config?.assets || []);
    const [howToPlay, setHowToPlay] = useState(existing?.config?.rules?.howToPlay || '');
    const [howToWin, setHowToWin] = useState(existing?.config?.rules?.howToWin || '');
    const [diceEnabled, setDiceEnabled] = useState(existing?.config?.dice?.enabled ?? true);
    const [diceSides, setDiceSides] = useState(existing?.config?.dice?.sides || 6);
    const [diceCount, setDiceCount] = useState(existing?.config?.dice?.count || 1);
    const [tab, setTab] = useState('pieces');
    const [drag, setDrag] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const fileRef = useRef(null);

    // First visit: open the build guide automatically
    useEffect(()=>{
      if(!localStorage.getItem('gb_guide_seen')){
        setShowGuide(true);
        localStorage.setItem('gb_guide_seen','1');
      }
    }, []);

    const scale = useMemo(()=> Math.min(1, 620/board.width, 470/board.height), [board]);

    // Build checklist — every item must be green before Save unlocks
    const checks = [
      { label:'Name', done: !!name.trim() },
      { label:'Board', done: true },
      { label: gameType==='card' ? 'Cards' : 'Pieces or cards', done: pieces.length>0 || cards.some(c=>(c.name||'').trim()||(c.description||'').trim()) },
      { label:'How to win', done: !!howToWin.trim() },
    ];
    const ready = checks.every(c=>c.done);

    // Type chooser — the first thing you see when building a NEW game
    const pickType = (t)=>{
      setGameType(t);
      if(t==='card'){ setDiceEnabled(false); setTab('cards'); const dark=BOARDS.find(b=>b.id==='blank-dark'); if(dark) setBoard(dark); }
      else if(t==='dice'){ setDiceEnabled(true); setDiceCount(2); setDiceSides(6); setTab('dice'); const dark=BOARDS.find(b=>b.id==='blank-dark'); if(dark) setBoard(dark); }
      else { setTab('board'); }
    };
    if(!gameType){
      const opts = [
        ['board','\u265f\ufe0f','Board game','Pieces on a board. Race tracks, quests, chess variants, territory battles.'],
        ['card','\ud83c\udccf','Card game','A deck players draw from. Trivia questions, action cards, quiz battles.'],
        ['dice','\ud83c\udfb2','Dice game','Roll and score. Push-your-luck, math practice, Yahtzee-style scoring.'],
      ];
      return (
        <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
          <h1 style={{color:'#fff',fontSize:'1.9rem',fontWeight:900,marginBottom:8,textAlign:'center'}}>What kind of game are you building?</h1>
          <p style={{color:'var(--muted)',fontSize:'.95rem',marginBottom:28,textAlign:'center',maxWidth:480}}>Pick a starting point. You get every tool no matter what – this just sets things up the right way.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,width:'100%',maxWidth:780}}>
            {opts.map(([id,emoji,title,desc])=>(
              <button key={id} onClick={()=>pickType(id)} className="gb-card" style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,padding:'26px 20px',cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:'2.8rem',marginBottom:10}}>{emoji}</div>
                <div style={{color:'#fff',fontWeight:800,fontSize:'1.1rem',marginBottom:6}}>{title}</div>
                <div style={{color:'var(--muted)',fontSize:'.84rem',lineHeight:1.55}}>{desc}</div>
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{marginTop:26,background:'none',border:0,color:'var(--faint)',fontWeight:700,fontSize:'.88rem',cursor:'pointer'}}>← Back to the lobby</button>
          <style>{`.gb-card{transition:transform .16s, border-color .16s} .gb-card:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.5)}`}</style>
        </div>
      );
    }

    const addPiece = (preset)=>{
      const n = pieces.length, size = 50;
      const x = Math.min(board.width - size, 40 + (n%6)*60);
      const y = Math.min(board.height - size, 40 + Math.floor(n/6)*60);
      setPieces(p=>[...p, { id:'pc'+Date.now()+Math.floor(Math.random()*999), name:preset.name, type:'token', color:preset.color||'#10b981', shape:preset.shape, imageUrl:preset.imageUrl, x, y, width:size, height:size }]);
    };
    const removePiece = (id)=> setPieces(p=>p.filter(x=>x.id!==id));

    const onUpload = (e)=>{
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if(!f) return;
      if(!f.type.startsWith('image/')){ window.gbToast('That file is not an image.','error'); return; }
      if(artwork.length >= 12){ window.gbToast('Max 12 uploads per game. Remove one first.','error'); return; }
      fileToArt(f, (dataUrl)=>{
        if(!dataUrl){ window.gbToast('Could not read that image.','error'); return; }
        const art = { id:'art'+Date.now(), name:f.name.replace(/\.[^.]+$/,'').slice(0,40)||'My art', imageUrl:dataUrl };
        setArtwork(a=>[...a, art]);
        window.gbToast('Artwork added. Click it to place it on the board.');
      });
    };
    const removeArt = (id)=> setArtwork(a=>a.filter(x=>x.id!==id));

    const onPiecePointerDown = (e, p)=>{
      e.preventDefault(); e.stopPropagation();
      const sx=e.clientX, sy=e.clientY, ox=p.x, oy=p.y;
      const move = (ev)=>{
        const nx = Math.max(0, Math.min(board.width-p.width,  ox+(ev.clientX-sx)/scale));
        const ny = Math.max(0, Math.min(board.height-p.height, oy+(ev.clientY-sy)/scale));
        setDrag({ id:p.id, x:nx, y:ny });
      };
      const up = (ev)=>{
        window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
        const nx = Math.max(0, Math.min(board.width-p.width,  ox+(ev.clientX-sx)/scale));
        const ny = Math.max(0, Math.min(board.height-p.height, oy+(ev.clientY-sy)/scale));
        setDrag(null);
        setPieces(arr=>arr.map(it=> it.id===p.id ? {...it,x:nx,y:ny} : it));
      };
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
    };

    const save = async ()=>{
      if(!name.trim()){ window.gbToast('Give your game a name (top bar).','error'); return; }
      const realCards = cards.filter(c=>(c.name||'').trim()||(c.description||'').trim());
      if(pieces.length===0 && realCards.length===0){ window.gbToast('Add at least one piece or card so there is something to play with.','error'); setTab(gameType==='card'?'cards':'pieces'); return; }
      if(!howToWin.trim()){ window.gbToast('Fill in "How to win" so players know when the game ends.','error'); setTab('rules'); return; }
      setSaving(true);
      try{
        const config = {
          gameType,
          board:{ width:board.width, height:board.height, backgroundColor:board.backgroundColor, gridSize:board.gridSize||0, ...(board.backgroundImage?{backgroundImage:board.backgroundImage}:{}) },
          pieces: pieces.map(p=>({ id:p.id, name:p.name, type:'token', color:p.color, shape:p.shape, ...(p.imageUrl?{imageUrl:p.imageUrl}:{}), x:p.x, y:p.y, width:p.width, height:p.height })),
          cards: realCards.map(c=>({ id:c.id, name:(c.name||'').trim()||'Card', description:(c.description||'').trim(), count:Math.max(1,Math.min(8,Number(c.count)||1)) })),
          dice:{ enabled:diceEnabled, count:diceCount, sides:diceSides },
          rules:{ howToPlay:howToPlay.trim(), howToWin:howToWin.trim() },
          features:{ enableDice:diceEnabled, enableCards:realCards.length>0, enableScores:true, enableTurns:true },
          assets: artwork,
        };
        // Firestore documents max out at 1MB — guard before we hit the wall
        if(JSON.stringify(config).length > 900000){
          window.gbToast('This game is too large. Remove some uploaded artwork.','error');
          setSaving(false); return;
        }
        if(editing){
          const status = isAdmin ? 'approved' : (existing.status==='approved'?'approved':'pending');
          await fbDb.collection('games').doc(existing.id).update({ name:name.trim(), config, status, isPublic:status==='approved', updatedAt:fbTimestamp() });
          window.gbToast('Game updated.');
        }else{
          const status = isAdmin ? 'approved' : 'pending';
          await fbDb.collection('games').add({ name:name.trim(), description:`Made by ${profile.displayName}`, creatorId:profile.uid, creatorName:profile.displayName, createdAt:fbTimestamp(), updatedAt:fbTimestamp(), config, status, isPublic:status==='approved' });
          window.gbToast(isAdmin ? 'Game published!' : 'Sent to your teacher for approval.');
        }
        onClose();
      }catch(e){ console.error(e); window.gbToast('Could not save the game.','error'); }
      finally{ setSaving(false); }
    };

    const rendered = pieces.map(p=> drag&&drag.id===p.id ? {...p,x:drag.x,y:drag.y} : p);
    const tabBtn = (t)=>({flex:1,padding:'12px 0',fontSize:'.66rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.05em',background:'none',border:0,cursor:'pointer',borderBottom:tab===t?'2px solid var(--emerald)':'2px solid transparent',color:tab===t?'var(--emerald-bright)':'var(--faint)'});
    const fieldLabel = {display:'block',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:800,color:'var(--faint)',marginBottom:5};
    const inputStyle = {width:'100%',background:'#262626',border:'1px solid var(--line)',borderRadius:10,padding:'9px 12px',color:'#fff',outline:'none',fontFamily:'inherit',fontSize:'.86rem'};

    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        {showGuide && <GuideModal onClose={()=>setShowGuide(false)} />}

        {/* top bar */}
        <div style={{height:64,borderBottom:'1px solid var(--line)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'rgba(23,23,23,.55)'}}>
          <button onClick={onClose} style={{display:'flex',alignItems:'center',gap:7,color:'var(--muted)',background:'none',border:0,cursor:'pointer',fontWeight:700,fontSize:'.9rem',flexShrink:0}}>
            <span style={{transform:'rotate(180deg)',display:'inline-flex'}}><I name="arrowRight" /></span> Lobby
          </button>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Step 1: name your game..." style={{flex:1,maxWidth:420,background:'#262626',border:'1px solid '+(name.trim()?'rgba(16,185,129,.4)':'var(--line)'),borderRadius:12,padding:'10px 16px',color:'#fff',fontSize:'.95rem',outline:'none'}} />
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button onClick={()=>setShowGuide(true)} title="How to build a game" style={{background:'rgba(255,255,255,.06)',color:'var(--text)',border:'1px solid var(--line)',fontWeight:800,padding:'10px 14px',borderRadius:12,cursor:'pointer',fontSize:'.9rem'}}>? Guide</button>
            <button onClick={save} disabled={saving} style={{background:ready?'var(--emerald)':'rgba(255,255,255,.08)',color:ready?'#04231a':'var(--faint)',fontWeight:800,padding:'10px 20px',borderRadius:12,border:0,cursor:'pointer',fontSize:'.9rem',opacity:saving?.6:1}}>{saving?'Saving...':(editing?'Update':'Save game')}</button>
          </div>
        </div>

        {/* build checklist strip */}
        <div style={{display:'flex',gap:8,alignItems:'center',padding:'9px 16px',borderBottom:'1px solid var(--line)',background:'rgba(23,23,23,.35)',flexWrap:'wrap'}}>
          <span style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:800,color:'var(--faint)'}}>Build checklist:</span>
          {checks.map(c=>(
            <span key={c.label} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'.76rem',fontWeight:700,padding:'4px 10px',borderRadius:99,background:c.done?'rgba(16,185,129,.14)':'rgba(255,255,255,.05)',color:c.done?'var(--emerald-bright)':'var(--faint)',border:'1px solid '+(c.done?'rgba(16,185,129,.35)':'var(--line)')}}>
              {c.done?'✓':'○'} {c.label}
            </span>
          ))}
          {ready && <span style={{fontSize:'.76rem',color:'var(--emerald-bright)',fontWeight:700}}>Ready to save!</span>}
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column'}} className="ed-wrap">
          <div className="scroll" style={{flex:1,overflow:'auto',padding:24,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
            <div style={{width:board.width*scale,height:board.height*scale,flexShrink:0}}>
              <div style={{position:'relative',borderRadius:12,boxShadow:'0 20px 50px rgba(0,0,0,.5)',overflow:'hidden',width:board.width,height:board.height,transform:`scale(${scale})`,transformOrigin:'top left',backgroundColor:board.backgroundColor,backgroundImage:board.backgroundImage?`url("${board.backgroundImage}")`:undefined,backgroundSize:board.backgroundImage?'cover':undefined}}>
                {board.gridSize>0 && <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundSize:`${board.gridSize}px ${board.gridSize}px`,backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)'}}></div>}
                {rendered.map(p=>(
                  <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name} className="ed-pc" style={{position:'absolute',left:p.x,top:p.y,width:p.width,height:p.height,cursor:'grab',touchAction:'none'}}>
                    {p.shape==='image'&&p.imageUrl ? <img src={p.imageUrl} alt="" draggable="false" style={{width:'100%',height:'100%',pointerEvents:'none',borderRadius:p.imageUrl.startsWith('data:')?8:0}} /> : <div style={{width:'100%',height:'100%',boxShadow:'0 2px 6px rgba(0,0,0,.3)',border:'2px solid rgba(0,0,0,.2)',background:p.color,borderRadius:p.shape==='circle'?'50%':8}}></div>}
                    <button onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();removePiece(p.id);}} className="ed-x" style={{position:'absolute',top:-9,right:-9,width:20,height:20,background:'var(--red)',color:'#fff',border:0,borderRadius:'50%',fontSize:11,cursor:'pointer',lineHeight:1}}>✕</button>
                  </div>
                ))}
                {pieces.length===0 && (
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                    <div style={{background:'rgba(0,0,0,.55)',color:'#fff',padding:'12px 20px',borderRadius:12,fontSize:'.9rem',fontWeight:700}}>Your board is empty... open PIECES and click one to place it</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="ed-panel scroll" style={{borderTop:'1px solid var(--line)',background:'rgba(23,23,23,.5)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',borderBottom:'1px solid var(--line)'}}>
              <button onClick={()=>setTab('pieces')} style={tabBtn('pieces')}>Pieces</button>
              <button onClick={()=>setTab('cards')} style={tabBtn('cards')}>Cards</button>
              <button onClick={()=>setTab('art')} style={tabBtn('art')}>Art</button>
              <button onClick={()=>setTab('board')} style={tabBtn('board')}>Board</button>
              <button onClick={()=>setTab('dice')} style={tabBtn('dice')}>Dice</button>
              <button onClick={()=>setTab('rules')} style={tabBtn('rules')}>Rules</button>
            </div>
            <div className="scroll" style={{padding:16,overflow:'auto',flex:1}}>
              {tab==='pieces' && (<div>
                <p style={{fontSize:'.78rem',color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Click a piece to drop it on the board, then drag it to its starting spot. Hover a placed piece to remove it.</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {PALETTE.map((pp,i)=>(
                    <button key={i} onClick={()=>addPiece(pp)} title={pp.name} style={{aspectRatio:'1',background:'#262626',border:'1px solid var(--line)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',padding:8,cursor:'pointer'}}>
                      {pp.shape==='image' ? <img src={pp.imageUrl} alt="" style={{width:'100%',height:'100%'}} /> : <div style={{width:26,height:26,background:pp.color,borderRadius:pp.shape==='circle'?'50%':6}}></div>}
                    </button>
                  ))}
                </div>
              </div>)}
              {tab==='cards' && (<div>
                <p style={{fontSize:'.78rem',color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Cards make up your game's deck. During the game, players hit "Draw card" and everyone sees what comes up – great for trivia questions, actions, and challenges.</p>
                <button onClick={()=>setCards(c=>[...c,{id:'cd'+Date.now()+Math.floor(Math.random()*999),name:'',description:'',count:1}])} style={{width:'100%',background:'rgba(16,185,129,.12)',color:'var(--emerald-bright)',border:'1px dashed rgba(16,185,129,.45)',borderRadius:12,padding:'13px',fontWeight:800,fontSize:'.9rem',cursor:'pointer',marginBottom:14}}>+ Add a card</button>
                {cards.length===0 && <div style={{fontSize:'.78rem',color:'var(--faint)',textAlign:'center'}}>No cards yet. Add one and write what it says or does.</div>}
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {cards.map((c,i)=>(
                    <div key={c.id} style={{background:'rgba(255,255,255,.03)',border:'1px solid var(--line)',borderRadius:12,padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:8,marginBottom:7}}>
                        <input value={c.name} onChange={e=>setCards(arr=>arr.map(x=>x.id===c.id?{...x,name:e.target.value}:x))} placeholder={'Card '+(i+1)+' name (e.g. "Question 1")'} style={{...inputStyle,flex:1}} />
                        <button onClick={()=>setCards(arr=>arr.filter(x=>x.id!==c.id))} title="Remove card" style={{width:32,flexShrink:0,background:'rgba(248,113,113,.12)',color:'var(--red)',border:'1px solid rgba(248,113,113,.3)',borderRadius:9,cursor:'pointer',fontWeight:800}}>✕</button>
                      </div>
                      <textarea value={c.description} onChange={e=>setCards(arr=>arr.map(x=>x.id===c.id?{...x,description:e.target.value}:x))} rows={2} placeholder="What the card says or does" style={{...inputStyle,resize:'vertical',lineHeight:1.5,marginBottom:7}} />
                      <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'.76rem',color:'var(--faint)',fontWeight:700}}>Copies in deck
                        <select value={c.count||1} onChange={e=>setCards(arr=>arr.map(x=>x.id===c.id?{...x,count:Number(e.target.value)}:x))} style={{...inputStyle,width:64}}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>)}
              {tab==='art' && (<div>
                <p style={{fontSize:'.78rem',color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Upload your own artwork (a drawing, photo, logo...). It becomes a game piece you can click to place, just like the built-in ones.</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{display:'none'}} />
                <button onClick={()=>fileRef.current && fileRef.current.click()} style={{width:'100%',background:'rgba(16,185,129,.12)',color:'var(--emerald-bright)',border:'1px dashed rgba(16,185,129,.45)',borderRadius:12,padding:'16px',fontWeight:800,fontSize:'.9rem',cursor:'pointer',marginBottom:14}}>⬆ Upload an image</button>
                {artwork.length===0
                  ? <div style={{fontSize:'.78rem',color:'var(--faint)',textAlign:'center'}}>No artwork yet. Draw something, snap a picture, and upload it!</div>
                  : <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                      {artwork.map(a=>(
                        <div key={a.id} className="ed-pc" style={{position:'relative'}}>
                          <button onClick={()=>addPiece({name:a.name, shape:'image', imageUrl:a.imageUrl})} title={'Place "'+a.name+'"'} style={{width:'100%',aspectRatio:'1',background:'#262626',border:'1px solid var(--line)',borderRadius:12,padding:5,cursor:'pointer',overflow:'hidden'}}>
                            <img src={a.imageUrl} alt={a.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
                          </button>
                          <button onClick={()=>removeArt(a.id)} className="ed-x" title="Remove from library" style={{position:'absolute',top:-7,right:-7,width:20,height:20,background:'var(--red)',color:'#fff',border:0,borderRadius:'50%',fontSize:11,cursor:'pointer',lineHeight:1}}>✕</button>
                        </div>
                      ))}
                    </div>}
                {artwork.length>0 && <p style={{fontSize:'.72rem',color:'var(--faint)',marginTop:10}}>{artwork.length}/12 uploads. Click art to place it on the board.</p>}
              </div>)}
              {tab==='board' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {BOARDS.map(b=>(
                    <button key={b.id} onClick={()=>setBoard(b)} style={{borderRadius:12,overflow:'hidden',border:board.id===b.id?'2px solid var(--emerald)':'2px solid var(--line)',cursor:'pointer',background:'none',padding:0}}>
                      <div style={{aspectRatio:'4/3',backgroundColor:b.backgroundColor,backgroundImage:b.backgroundImage?`url("${b.backgroundImage}")`:undefined,backgroundSize:'cover',backgroundPosition:'center'}}></div>
                      <div style={{fontSize:'.7rem',color:'var(--muted)',padding:'6px 0',textAlign:'center',background:'#262626'}}>{b.name}</div>
                    </button>
                  ))}
                </div>
              )}
              {tab==='dice' && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'.9rem',color:'#fff'}}>
                    <span>Enable dice</span>
                    <input type="checkbox" checked={diceEnabled} onChange={e=>setDiceEnabled(e.target.checked)} style={{width:20,height:20,accentColor:'var(--emerald)'}} />
                  </label>
                  {diceEnabled && (<>
                    <label style={{fontSize:'.86rem',color:'var(--muted)'}}>
                      <span style={fieldLabel}>How many dice</span>
                      <select value={diceCount} onChange={e=>setDiceCount(Number(e.target.value))} style={inputStyle}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select>
                    </label>
                    <label style={{fontSize:'.86rem',color:'var(--muted)'}}>
                      <span style={fieldLabel}>Sides per die</span>
                      <select value={diceSides} onChange={e=>setDiceSides(Number(e.target.value))} style={inputStyle}>{[4,6,8,10,12,20].map(s=><option key={s} value={s}>d{s}</option>)}</select>
                    </label>
                  </>)}
                </div>
              )}
              {tab==='rules' && (
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <p style={{fontSize:'.78rem',color:'var(--faint)',lineHeight:1.5}}>Rules show up when the game opens, so every player knows what to do and when it's over.</p>
                  <label>
                    <span style={fieldLabel}>How to play (what happens on a turn)</span>
                    <textarea value={howToPlay} onChange={e=>setHowToPlay(e.target.value)} rows={4} placeholder={'Example: On your turn, roll the die and move your piece that many squares. Then end your turn.'} style={{...inputStyle,resize:'vertical',lineHeight:1.5}} />
                  </label>
                  <label>
                    <span style={{...fieldLabel,color:howToWin.trim()?'var(--faint)':'var(--amber)'}}>How to win (required... how does the game END?)</span>
                    <textarea value={howToWin} onChange={e=>setHowToWin(e.target.value)} rows={3} placeholder={'Example: First player to reach the finish square wins. OR: First to 10 points wins.'} style={{...inputStyle,resize:'vertical',lineHeight:1.5,border:'1px solid '+(howToWin.trim()?'rgba(16,185,129,.4)':'rgba(251,191,36,.5)')}} />
                  </label>
                </div>
              )}
            </div>
            <div style={{padding:'12px 16px',borderTop:'1px solid var(--line)',fontSize:'.74rem',color:'var(--faint)'}}>
              {pieces.length} piece{pieces.length===1?'':'s'} · {board.name}{isAdmin?'':' · saves for teacher approval'}
            </div>
          </div>
        </div>
        <style>{`.ed-pc .ed-x{opacity:0} .ed-pc:hover .ed-x{opacity:1} @media(min-width:1000px){.ed-wrap{flex-direction:row!important} .ed-panel{width:330px;border-top:0!important;border-left:1px solid var(--line)}}`}</style>
      </div>
    );
  }
  window.GBEditor = GBEditor;
})();
