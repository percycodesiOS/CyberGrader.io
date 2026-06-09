// GameBash — build-your-own-game editor. Exposes window.GBEditor.
// Pick a board, click pieces onto it, drag to place, set dice, name + save.
// New games by students save as 'pending' (teacher approves); teacher games publish.
(function(){
  const { useState, useMemo } = React;

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
    const [board, setBoard] = useState(startBoard);
    const [pieces, setPieces] = useState(existing?.config?.pieces ? existing.config.pieces.map(p=>({...p})) : []);
    const [diceEnabled, setDiceEnabled] = useState(existing?.config?.dice?.enabled ?? true);
    const [diceSides, setDiceSides] = useState(existing?.config?.dice?.sides || 6);
    const [diceCount, setDiceCount] = useState(existing?.config?.dice?.count || 1);
    const [tab, setTab] = useState('pieces');
    const [drag, setDrag] = useState(null);
    const [saving, setSaving] = useState(false);

    const scale = useMemo(()=> Math.min(1, 620/board.width, 470/board.height), [board]);

    const addPiece = (preset)=>{
      const n = pieces.length, size = 50;
      const x = Math.min(board.width - size, 40 + (n%6)*60);
      const y = Math.min(board.height - size, 40 + Math.floor(n/6)*60);
      setPieces(p=>[...p, { id:'pc'+Date.now()+Math.floor(Math.random()*999), name:preset.name, type:'token', color:preset.color, shape:preset.shape, imageUrl:preset.imageUrl, x, y, width:size, height:size }]);
    };
    const removePiece = (id)=> setPieces(p=>p.filter(x=>x.id!==id));

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
      if(!name.trim()){ window.gbToast('Give your game a name first.','error'); return; }
      setSaving(true);
      try{
        const config = {
          board:{ width:board.width, height:board.height, backgroundColor:board.backgroundColor, gridSize:board.gridSize||0, ...(board.backgroundImage?{backgroundImage:board.backgroundImage}:{}) },
          pieces: pieces.map(p=>({ id:p.id, name:p.name, type:'token', color:p.color, shape:p.shape, ...(p.imageUrl?{imageUrl:p.imageUrl}:{}), x:p.x, y:p.y, width:p.width, height:p.height })),
          cards: existing?.config?.cards || [],
          dice:{ enabled:diceEnabled, count:diceCount, sides:diceSides },
          features:{ enableDice:diceEnabled, enableCards:(existing?.config?.cards||[]).length>0, enableScores:true, enableTurns:true },
        };
        if(editing){
          // keep original status unless admin; creator edits don't auto-approve
          const status = isAdmin ? (existing.status==='approved'?'approved':'approved') : (existing.status==='approved'?'approved':'pending');
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
    const tabBtn = (t)=>({flex:1,padding:'13px 0',fontSize:'.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',background:'none',border:0,cursor:'pointer',borderBottom:tab===t?'2px solid var(--emerald)':'2px solid transparent',color:tab===t?'var(--emerald-bright)':'var(--faint)'});

    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <div style={{height:64,borderBottom:'1px solid var(--line)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'rgba(23,23,23,.55)'}}>
          <button onClick={onClose} style={{display:'flex',alignItems:'center',gap:7,color:'var(--muted)',background:'none',border:0,cursor:'pointer',fontWeight:700,fontSize:'.9rem',flexShrink:0}}>
            <span style={{transform:'rotate(180deg)',display:'inline-flex'}}><I name="arrowRight" /></span> Lobby
          </button>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name your game..." style={{flex:1,maxWidth:420,background:'#262626',border:'1px solid var(--line)',borderRadius:12,padding:'10px 16px',color:'#fff',fontSize:'.95rem',outline:'none'}} />
          <button onClick={save} disabled={saving} style={{background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'10px 20px',borderRadius:12,border:0,cursor:'pointer',fontSize:'.9rem',flexShrink:0,opacity:saving?.6:1}}>{saving?'Saving...':(editing?'Update':'Save game')}</button>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column'}} className="ed-wrap">
          <div className="scroll" style={{flex:1,overflow:'auto',padding:24,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
            <div style={{width:board.width*scale,height:board.height*scale,flexShrink:0}}>
              <div style={{position:'relative',borderRadius:12,boxShadow:'0 20px 50px rgba(0,0,0,.5)',overflow:'hidden',width:board.width,height:board.height,transform:`scale(${scale})`,transformOrigin:'top left',backgroundColor:board.backgroundColor,backgroundImage:board.backgroundImage?`url("${board.backgroundImage}")`:undefined,backgroundSize:board.backgroundImage?'cover':undefined}}>
                {board.gridSize>0 && <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundSize:`${board.gridSize}px ${board.gridSize}px`,backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)'}}></div>}
                {rendered.map(p=>(
                  <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name} className="ed-pc" style={{position:'absolute',left:p.x,top:p.y,width:p.width,height:p.height,cursor:'grab',touchAction:'none'}}>
                    {p.shape==='image'&&p.imageUrl ? <img src={p.imageUrl} alt="" draggable="false" style={{width:'100%',height:'100%',pointerEvents:'none'}} /> : <div style={{width:'100%',height:'100%',boxShadow:'0 2px 6px rgba(0,0,0,.3)',border:'2px solid rgba(0,0,0,.2)',background:p.color,borderRadius:p.shape==='circle'?'50%':8}}></div>}
                    <button onPointerDown={(e)=>e.stopPropagation()} onClick={(e)=>{e.stopPropagation();removePiece(p.id);}} className="ed-x" style={{position:'absolute',top:-9,right:-9,width:20,height:20,background:'var(--red)',color:'#fff',border:0,borderRadius:'50%',fontSize:11,cursor:'pointer',lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ed-panel scroll" style={{borderTop:'1px solid var(--line)',background:'rgba(23,23,23,.5)',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',borderBottom:'1px solid var(--line)'}}>
              <button onClick={()=>setTab('pieces')} style={tabBtn('pieces')}>Pieces</button>
              <button onClick={()=>setTab('board')} style={tabBtn('board')}>Board</button>
              <button onClick={()=>setTab('dice')} style={tabBtn('dice')}>Dice</button>
            </div>
            <div className="scroll" style={{padding:16,overflow:'auto',flex:1}}>
              {tab==='pieces' && (<div>
                <p style={{fontSize:'.78rem',color:'var(--faint)',marginBottom:12,lineHeight:1.5}}>Click a piece to drop it on the board, then drag to place it. Hover a placed piece to remove it.</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {PALETTE.map((pp,i)=>(
                    <button key={i} onClick={()=>addPiece(pp)} title={pp.name} style={{aspectRatio:'1',background:'#262626',border:'1px solid var(--line)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',padding:8,cursor:'pointer'}}>
                      {pp.shape==='image' ? <img src={pp.imageUrl} alt="" style={{width:'100%',height:'100%'}} /> : <div style={{width:26,height:26,background:pp.color,borderRadius:pp.shape==='circle'?'50%':6}}></div>}
                    </button>
                  ))}
                </div>
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
                      <span style={{display:'block',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:800,color:'var(--faint)',marginBottom:5}}>How many dice</span>
                      <select value={diceCount} onChange={e=>setDiceCount(Number(e.target.value))} style={{width:'100%',background:'#262626',border:'1px solid var(--line)',borderRadius:10,padding:'9px 12px',color:'#fff',outline:'none'}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select>
                    </label>
                    <label style={{fontSize:'.86rem',color:'var(--muted)'}}>
                      <span style={{display:'block',fontSize:'.7rem',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:800,color:'var(--faint)',marginBottom:5}}>Sides per die</span>
                      <select value={diceSides} onChange={e=>setDiceSides(Number(e.target.value))} style={{width:'100%',background:'#262626',border:'1px solid var(--line)',borderRadius:10,padding:'9px 12px',color:'#fff',outline:'none'}}>{[4,6,8,10,12,20].map(s=><option key={s} value={s}>d{s}</option>)}</select>
                    </label>
                  </>)}
                </div>
              )}
            </div>
            <div style={{padding:'12px 16px',borderTop:'1px solid var(--line)',fontSize:'.74rem',color:'var(--faint)'}}>
              {pieces.length} piece{pieces.length===1?'':'s'} · {board.name}{isAdmin?'':' · saves for teacher approval'}
            </div>
          </div>
        </div>
        <style>{`.ed-pc .ed-x{opacity:0} .ed-pc:hover .ed-x{opacity:1} @media(min-width:1000px){.ed-wrap{flex-direction:row!important} .ed-panel{width:320px;border-top:0!important;border-left:1px solid var(--line)}}`}</style>
      </div>
    );
  }
  window.GBEditor = GBEditor;
})();
