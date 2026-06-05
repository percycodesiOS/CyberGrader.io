// GameBash — Create-game editor. Exposes window.GBEditor.
// Pick a board, click pieces to add them, drag to position, toggle dice, save.
(function(){
  const { useState, useMemo } = React;

  function GBEditor({ profile, isAdmin, onClose }){
    const I = window.GBIcon;
    const BOARDS = window.GB_BOARDS || [];
    const PALETTE = window.GB_PIECES || [];

    const [name, setName] = useState('');
    const [board, setBoard] = useState(BOARDS[0]);
    const [pieces, setPieces] = useState([]);
    const [diceEnabled, setDiceEnabled] = useState(true);
    const [diceSides, setDiceSides] = useState(6);
    const [tab, setTab] = useState('pieces');
    const [drag, setDrag] = useState(null);
    const [saving, setSaving] = useState(false);

    // scale the (possibly large) board down to fit the preview column
    const scale = useMemo(()=> Math.min(1, 600/board.width, 460/board.height), [board]);

    const addPiece = (preset)=>{
      const n = pieces.length;
      const size = 50;
      const x = Math.min(board.width - size, 40 + (n%6)*60);
      const y = Math.min(board.height - size, 40 + Math.floor(n/6)*60);
      setPieces(p=>[...p, { id:'pc'+Date.now()+Math.floor(Math.random()*999), name:preset.name, color:preset.color, shape:preset.shape, imageUrl:preset.imageUrl, x, y, width:size, height:size }]);
    };
    const removePiece = (id)=> setPieces(p=>p.filter(x=>x.id!==id));

    const onPiecePointerDown = (e, p, boardEl)=>{
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX, startY = e.clientY, ox = p.x, oy = p.y;
      const move = (ev)=>{
        const nx = Math.max(0, Math.min(board.width - p.width,  ox + (ev.clientX-startX)/scale));
        const ny = Math.max(0, Math.min(board.height - p.height, oy + (ev.clientY-startY)/scale));
        setDrag({ id:p.id, x:nx, y:ny });
      };
      const up = (ev)=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const nx = Math.max(0, Math.min(board.width - p.width,  ox + (ev.clientX-startX)/scale));
        const ny = Math.max(0, Math.min(board.height - p.height, oy + (ev.clientY-startY)/scale));
        setDrag(null);
        setPieces(arr=>arr.map(it=> it.id===p.id ? {...it, x:nx, y:ny} : it));
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

    const save = async ()=>{
      if(!name.trim()){ window.gbToast('Give your game a name first.','error'); return; }
      setSaving(true);
      try{
        const config = {
          board: { width:board.width, height:board.height, backgroundColor:board.backgroundColor, gridSize:board.gridSize||0, ...(board.backgroundImage?{backgroundImage:board.backgroundImage}:{}) },
          pieces: pieces.map(p=>({ id:p.id, name:p.name, type:'token', color:p.color, shape:p.shape, ...(p.imageUrl?{imageUrl:p.imageUrl}:{}), x:p.x, y:p.y, width:p.width, height:p.height })),
          cards: [],
          dice: { enabled:diceEnabled, count:1, sides:diceSides },
          features: { enableDice:diceEnabled, enableCards:false, enableScores:true, enableTurns:true },
          assets: [],
        };
        const status = isAdmin ? 'approved' : 'pending';
        await fbDb.collection('games').add({
          name:name.trim(), description:`Made by ${profile.displayName}`,
          creatorId:profile.uid, creatorName:profile.displayName,
          createdAt:fbTimestamp(), updatedAt:fbTimestamp(),
          config, status, isPublic: status==='approved',
        });
        window.gbToast(isAdmin ? 'Game saved and published!' : 'Sent to your teacher for approval.');
        onClose();
      }catch(e){ console.error(e); window.gbToast('Could not save the game.','error'); }
      finally{ setSaving(false); }
    };

    const rendered = pieces.map(p=> drag&&drag.id===p.id ? {...p, x:drag.x, y:drag.y} : p);

    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col">
        {/* header */}
        <div className="h-16 border-b border-white/5 px-4 flex items-center justify-between bg-neutral-900/50 gap-3">
          <button onClick={onClose} className="flex items-center gap-2 text-neutral-300 hover:text-white text-sm font-semibold shrink-0">
            <I name="arrowRight" className="w-4 h-4 rotate-180" /> Lobby
          </button>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name your game..." className="flex-1 max-w-md bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          <button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm shrink-0">{saving?'Saving...':'Save game'}</button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* board preview */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6 flex items-start justify-center">
            <div style={{ width:board.width*scale, height:board.height*scale }} className="shrink-0">
              <div className="relative rounded-xl shadow-2xl overflow-hidden" style={{ width:board.width, height:board.height, transform:`scale(${scale})`, transformOrigin:'top left', backgroundColor:board.backgroundColor, backgroundImage:board.backgroundImage?`url("${board.backgroundImage}")`:undefined, backgroundSize:board.backgroundImage?'cover':undefined }}>
                {board.gridSize>0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundSize:`${board.gridSize}px ${board.gridSize}px`, backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)' }} />
                )}
                {rendered.map(p=>(
                  <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name}
                    className="absolute cursor-grab active:cursor-grabbing group/pc touch-none"
                    style={{ left:p.x, top:p.y, width:p.width, height:p.height }}>
                    {p.shape==='image' && p.imageUrl
                      ? <img src={p.imageUrl} alt="" draggable="false" className="w-full h-full pointer-events-none" />
                      : <div className="w-full h-full shadow-md border-2 border-black/20" style={{ background:p.color, borderRadius:p.shape==='circle'?'9999px':'8px' }} />}
                    <button onPointerDown={(e)=>{e.stopPropagation();}} onClick={(e)=>{e.stopPropagation(); removePiece(p.id);}} className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover/pc:opacity-100">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* tools */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-neutral-900/40 flex flex-col">
            <div className="flex border-b border-white/5">
              {['pieces','board','dice'].map(t=>(
                <button key={t} onClick={()=>setTab(t)} className={'flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors '+(tab===t?'text-emerald-400 border-b-2 border-emerald-500':'text-neutral-500 hover:text-neutral-300')}>{t}</button>
              ))}
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              {tab==='pieces' && (
                <div>
                  <p className="text-xs text-neutral-500 mb-3">Click a piece to drop it on the board, then drag to position. Hover a placed piece to remove it.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PALETTE.map((pp,i)=>(
                      <button key={i} onClick={()=>addPiece(pp)} title={pp.name} className="aspect-square bg-neutral-800 hover:bg-neutral-700 border border-white/5 rounded-xl flex items-center justify-center p-2">
                        {pp.shape==='image'
                          ? <img src={pp.imageUrl} alt="" className="w-full h-full" />
                          : <div className="w-7 h-7" style={{ background:pp.color, borderRadius:pp.shape==='circle'?'9999px':'6px' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tab==='board' && (
                <div className="grid grid-cols-2 gap-2">
                  {BOARDS.map(b=>(
                    <button key={b.id} onClick={()=>setBoard(b)} className={'rounded-xl overflow-hidden border-2 transition-colors '+(board.id===b.id?'border-emerald-500':'border-white/5 hover:border-white/20')}>
                      <div className="aspect-[4/3]" style={{ backgroundColor:b.backgroundColor, backgroundImage:b.backgroundImage?`url("${b.backgroundImage}")`:undefined, backgroundSize:'cover', backgroundPosition:'center' }} />
                      <div className="text-[11px] text-neutral-300 py-1.5 text-center bg-neutral-800">{b.name}</div>
                    </button>
                  ))}
                </div>
              )}
              {tab==='dice' && (
                <div className="space-y-4">
                  <label className="flex items-center justify-between text-sm text-neutral-200">
                    <span>Enable dice</span>
                    <input type="checkbox" checked={diceEnabled} onChange={e=>setDiceEnabled(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                  </label>
                  {diceEnabled && (
                    <label className="block text-sm text-neutral-300">
                      <span className="text-xs text-neutral-500 uppercase tracking-wider font-bold">Sides</span>
                      <select value={diceSides} onChange={e=>setDiceSides(Number(e.target.value))} className="mt-1 w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2 text-white outline-none">
                        {[4,6,8,10,12,20].map(s=><option key={s} value={s}>d{s}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/5 text-[11px] text-neutral-500">
              {pieces.length} piece{pieces.length===1?'':'s'} · {board.name}{isAdmin?'':' · saves as a request for teacher approval'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.GBEditor = GBEditor;
})();
