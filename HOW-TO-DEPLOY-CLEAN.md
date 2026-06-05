// GameBash — Game Room (live board + dice + chat). Exposes window.GBRoom.
// Real-time via Firestore: rooms/{id} doc + rooms/{id}/messages subcollection.
(function(){
  const { useState, useEffect, useRef } = React;
  const Icon = () => null; // replaced below by window.GBIcon at render

  function GBRoom({ roomId, profile, onLeave }){
    const I = window.GBIcon;
    const [room, setRoom] = useState(null);
    const [config, setConfig] = useState(null);
    const [drag, setDrag] = useState(null);      // { id, x, y }
    const [messages, setMessages] = useState([]);
    const [chat, setChat] = useState('');
    const boardRef = useRef(null);
    const chatEndRef = useRef(null);

    // Subscribe to the room doc
    useEffect(()=>{
      const unsub = fbDb.collection('rooms').doc(roomId).onSnapshot(
        snap=>{ if(snap.exists) setRoom({ id:snap.id, ...snap.data() }); else { window.gbToast('Room closed.','error'); onLeave(); } },
        e=>{ console.error(e); window.gbToast('Lost connection to the room.','error'); }
      );
      return ()=>unsub();
    }, [roomId]);

    // Load the game config once we know the gameId
    useEffect(()=>{
      if(!room?.gameId || config) return;
      fbDb.collection('games').doc(room.gameId).get()
        .then(s=>{ if(s.exists) setConfig(s.data().config); })
        .catch(e=>console.error(e));
    }, [room?.gameId]);

    // Join: add myself to the room if I'm not already in it
    useEffect(()=>{
      if(!room) return;
      if(!room.playerUids?.includes(profile.uid)){
        const color = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316','#ec4899','#06b6d4'][ (room.players?.length||0) % 8 ];
        const player = { uid:profile.uid, displayName:profile.displayName, photoURL:profile.photoURL||null, color };
        fbDb.collection('rooms').doc(roomId).update({
          players: firebase.firestore.FieldValue.arrayUnion(player),
          playerUids: firebase.firestore.FieldValue.arrayUnion(profile.uid),
        }).catch(e=>{ console.error(e); window.gbToast('Could not join (rules may need the GameBash update).','error'); });
      }
    }, [room?.id, room?.playerUids?.length]);

    // Chat subscription
    useEffect(()=>{
      const unsub = fbDb.collection('rooms').doc(roomId).collection('messages').orderBy('createdAt','asc')
        .onSnapshot(s=> setMessages(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
      return ()=>unsub();
    }, [roomId]);
    useEffect(()=>{ chatEndRef.current?.scrollTo(0, chatEndRef.current.scrollHeight); }, [messages.length]);

    if(!room || !config){
      return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="gb-spin"></div></div>;
    }

    const board = config.board;
    const overrides = room.state?.pieces || {};
    const pieces = (config.pieces||[]).map(p=>{
      if(drag && drag.id===p.id) return {...p, x:drag.x, y:drag.y};
      const o = overrides[p.id];
      return o ? {...p, x:o.x, y:o.y} : p;
    });

    // ── piece dragging (native board coords) ──
    const onPiecePointerDown = (e, p)=>{
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const origX = p.x, origY = p.y;
      const move = (ev)=>{
        const nx = Math.max(0, Math.min(board.width - p.width,  origX + (ev.clientX - startX)));
        const ny = Math.max(0, Math.min(board.height - p.height, origY + (ev.clientY - startY)));
        setDrag({ id:p.id, x:nx, y:ny });
      };
      const up = (ev)=>{
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        const nx = Math.max(0, Math.min(board.width - p.width,  origX + (ev.clientX - startX)));
        const ny = Math.max(0, Math.min(board.height - p.height, origY + (ev.clientY - startY)));
        setDrag(null);
        fbDb.collection('rooms').doc(roomId).update({
          ['state.pieces.'+p.id]: { x:nx, y:ny, lastMovedBy:profile.uid }
        }).catch(err=>{ console.error(err); window.gbToast('Move not saved.','error'); });
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

    const rollDice = ()=>{
      const d = config.dice || { count:1, sides:6 };
      const values = Array.from({length:d.count||1}, ()=> 1 + Math.floor(Math.random()*(d.sides||6)));
      fbDb.collection('rooms').doc(roomId).update({
        'state.diceResult': { values, rolledBy:profile.uid, timestamp:Date.now() }
      }).catch(e=>console.error(e));
    };

    const sendChat = (e)=>{
      e.preventDefault();
      const text = chat.trim();
      if(!text) return;
      setChat('');
      fbDb.collection('rooms').doc(roomId).collection('messages').add({
        senderId:profile.uid, senderName:profile.displayName, text, createdAt:fbTimestamp(), type:'chat'
      }).catch(err=>{ console.error(err); window.gbToast('Message not sent.','error'); });
    };

    const dice = room.state?.diceResult;

    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col">
        {/* top bar */}
        <div className="h-14 border-b border-white/5 px-4 flex items-center justify-between bg-neutral-900/50">
          <button onClick={onLeave} className="flex items-center gap-2 text-neutral-300 hover:text-white text-sm font-semibold">
            <I name="arrowRight" className="w-4 h-4 rotate-180" /> Leave
          </button>
          <div className="flex items-center -space-x-2">
            {(room.players||[]).map(pl=>(
              <div key={pl.uid} title={pl.displayName} className="w-8 h-8 rounded-full border-2 border-neutral-900 flex items-center justify-center text-xs font-bold text-white" style={{background:pl.color}}>
                {pl.displayName?.[0]?.toUpperCase()||'?'}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* board */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6 flex items-start justify-center">
            <div ref={boardRef} className="relative rounded-xl shadow-2xl shrink-0"
              style={{ width:board.width, height:board.height, backgroundColor:board.backgroundColor,
                       backgroundImage: board.backgroundImage?`url("${board.backgroundImage}")`:undefined,
                       backgroundSize: board.backgroundImage?'cover':undefined }}>
              {/* grid */}
              {board.gridSize>0 && (
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundSize:`${board.gridSize}px ${board.gridSize}px`, backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)' }} />
              )}
              {pieces.map(p=>(
                <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name}
                  className="absolute cursor-grab active:cursor-grabbing select-none touch-none"
                  style={{ left:p.x, top:p.y, width:p.width, height:p.height }}>
                  {p.shape==='image' && p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} draggable="false" className="w-full h-full pointer-events-none" />
                  ) : (
                    <div className="w-full h-full shadow-md border-2 border-black/20" style={{ background:p.color, borderRadius: p.shape==='circle'?'9999px':'8px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* side panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-neutral-900/40 flex flex-col">
            {/* dice */}
            {config.features?.enableDice && (
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-neutral-400 text-xs uppercase tracking-wider font-bold">Dice</div>
                    {dice ? (
                      <div className="text-white font-bold text-lg">{dice.values.join(' + ')}{dice.values.length>1?` = ${dice.values.reduce((a,b)=>a+b,0)}`:''}</div>
                    ) : <div className="text-neutral-500 text-sm">Roll to start</div>}
                  </div>
                  <button onClick={rollDice} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm">🎲 Roll</button>
                </div>
              </div>
            )}
            {/* chat */}
            <div className="flex-1 flex flex-col min-h-[240px]">
              <div ref={chatEndRef} className="flex-1 overflow-auto custom-scrollbar p-4 space-y-2">
                {messages.length===0 && <div className="text-neutral-600 text-xs text-center mt-6">Say hi 👋</div>}
                {messages.map(m=>(
                  <div key={m.id} className="text-sm">
                    <span className="font-bold text-emerald-400">{m.senderName}: </span>
                    <span className="text-neutral-200">{m.text}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={sendChat} className="p-3 border-t border-white/5 flex gap-2">
                <input value={chat} onChange={e=>setChat(e.target.value)} placeholder="Message..." className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-xl text-sm font-bold">Send</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.GBRoom = GBRoom;
})();
