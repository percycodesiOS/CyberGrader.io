// GameBash — live multiplayer Game Room. Exposes window.GBRoom.
// Real-time via Firestore: rooms/{id} doc + rooms/{id}/messages subcollection.
(function(){
  const { useState, useEffect, useRef } = React;

  function GBRoom({ roomId, profile, isAdmin, onLeave }){
    const I = window.GBIcon;
    const [room, setRoom] = useState(null);
    const [config, setConfig] = useState(null);
    const [drag, setDrag] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chat, setChat] = useState('');
    const [rolling, setRolling] = useState(false);
    const boardRef = useRef(null);
    const chatRef = useRef(null);

    useEffect(()=>{
      const unsub = fbDb.collection('rooms').doc(roomId).onSnapshot(
        snap=>{ if(snap.exists) setRoom({ id:snap.id, ...snap.data() }); else { window.gbToast('Room closed.','error'); onLeave(); } },
        e=>{ console.error(e); window.gbToast('Lost connection to the room.','error'); }
      );
      return ()=>unsub();
    }, [roomId]);

    useEffect(()=>{
      if(!room?.gameId || config) return;
      fbDb.collection('games').doc(room.gameId).get().then(s=>{ if(s.exists) setConfig(s.data().config); }).catch(e=>console.error(e));
    }, [room?.gameId]);

    // auto-join
    useEffect(()=>{
      if(!room) return;
      if(!room.playerUids?.includes(profile.uid)){
        const color = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316','#ec4899','#06b6d4'][(room.players?.length||0)%8];
        const player = { uid:profile.uid, displayName:profile.displayName, photoURL:profile.photoURL||null, color };
        fbDb.collection('rooms').doc(roomId).update({ players:fbArrayUnion(player), playerUids:fbArrayUnion(profile.uid) })
          .catch(e=>{ console.error(e); window.gbToast('Could not join this room.','error'); });
      }
    }, [room?.id, room?.playerUids?.length]);

    useEffect(()=>{
      const unsub = fbDb.collection('rooms').doc(roomId).collection('messages').orderBy('createdAt','asc')
        .onSnapshot(s=> setMessages(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
      return ()=>unsub();
    }, [roomId]);
    useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages.length]);

    if(!room || !config) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="gb-spin"></div></div>;

    const board = config.board;
    const overrides = room.state?.pieces || {};
    const pieces = (config.pieces||[]).map(p=>{
      if(drag && drag.id===p.id) return {...p, x:drag.x, y:drag.y};
      const o = overrides[p.id];
      return o ? {...p, x:o.x, y:o.y} : p;
    });
    const myTurn = !config.features?.enableTurns || room.state?.turn===profile.uid;

    const onPiecePointerDown = (e, p)=>{
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const vscale = rect.width / board.width;
      const sx=e.clientX, sy=e.clientY, ox=p.x, oy=p.y;
      const move = (ev)=>{
        const nx = Math.max(0, Math.min(board.width-p.width,  ox+(ev.clientX-sx)/vscale));
        const ny = Math.max(0, Math.min(board.height-p.height, oy+(ev.clientY-sy)/vscale));
        setDrag({ id:p.id, x:nx, y:ny });
      };
      const up = (ev)=>{
        window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up);
        const nx = Math.max(0, Math.min(board.width-p.width,  ox+(ev.clientX-sx)/vscale));
        const ny = Math.max(0, Math.min(board.height-p.height, oy+(ev.clientY-sy)/vscale));
        setDrag(null);
        fbDb.collection('rooms').doc(roomId).update({ ['state.pieces.'+p.id]:{ x:nx, y:ny, lastMovedBy:profile.uid } })
          .catch(err=>{ console.error(err); window.gbToast('Move not saved.','error'); });
      };
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
    };

    const rollDice = ()=>{
      const d = config.dice || {count:1,sides:6};
      setRolling(true);
      const values = Array.from({length:d.count||1}, ()=> 1+Math.floor(Math.random()*(d.sides||6)));
      fbDb.collection('rooms').doc(roomId).update({ 'state.diceResult':{ values, rolledBy:profile.uid, rolledByName:profile.displayName, timestamp:Date.now() } })
        .catch(e=>console.error(e));
      setTimeout(()=>setRolling(false), 500);
    };

    const passTurn = ()=>{
      const uids = room.playerUids || [];
      if(uids.length<2) return;
      const idx = uids.indexOf(room.state?.turn);
      const next = uids[(idx+1)%uids.length];
      fbDb.collection('rooms').doc(roomId).update({ 'state.turn':next }).catch(e=>console.error(e));
    };

    const sendChat = (e)=>{
      e.preventDefault();
      const text = chat.trim(); if(!text) return;
      setChat('');
      fbDb.collection('rooms').doc(roomId).collection('messages').add({ senderId:profile.uid, senderName:profile.displayName, text, createdAt:fbTimestamp(), type:'chat' })
        .catch(err=>{ console.error(err); window.gbToast('Message not sent.','error'); });
    };

    const endRoom = async ()=>{
      if(!confirm('End this game for everyone?')) return;
      try{ await fbDb.collection('rooms').doc(roomId).delete(); }catch(e){ console.error(e); }
      onLeave();
    };

    const dice = room.state?.diceResult;
    const turnPlayer = (room.players||[]).find(p=>p.uid===room.state?.turn);

    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
        <div style={{height:56,borderBottom:'1px solid var(--line)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(23,23,23,.55)'}}>
          <button onClick={onLeave} style={{display:'flex',alignItems:'center',gap:7,color:'var(--muted)',background:'none',border:0,cursor:'pointer',fontWeight:700,fontSize:'.9rem'}}>
            <span style={{transform:'rotate(180deg)',display:'inline-flex'}}><I name="arrowRight" /></span> Leave
          </button>
          {config.features?.enableTurns && turnPlayer && (
            <div style={{fontSize:'.84rem',color:'var(--muted)'}}>Turn: <strong style={{color:turnPlayer.color}}>{turnPlayer.displayName}</strong></div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{display:'flex',marginRight:4}}>
              {(room.players||[]).map((pl,i)=>(
                <div key={pl.uid} title={pl.displayName} style={{width:30,height:30,borderRadius:'50%',border:'2px solid #0a0a0a',marginLeft:i?-8:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:800,color:'#fff',background:pl.color}}>{pl.displayName?.[0]?.toUpperCase()||'?'}</div>
              ))}
            </div>
            {(isAdmin || room.hostId===profile.uid) && <button onClick={endRoom} style={{fontSize:'.78rem',fontWeight:700,color:'var(--red)',background:'rgba(255,255,255,.05)',border:'1px solid var(--line)',borderRadius:9,padding:'7px 11px',cursor:'pointer'}}>End</button>}
          </div>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column'}} className="room-wrap">
          <div className="scroll" style={{flex:1,overflow:'auto',padding:24,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
            <div ref={boardRef} style={{position:'relative',borderRadius:12,boxShadow:'0 20px 50px rgba(0,0,0,.5)',flexShrink:0,width:'min(100%, '+board.width+'px)',aspectRatio:board.width+'/'+board.height,backgroundColor:board.backgroundColor,backgroundImage:board.backgroundImage?`url("${board.backgroundImage}")`:undefined,backgroundSize:'cover'}}>
              {board.gridSize>0 && <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundSize:`${(board.gridSize/board.width*100)}% ${(board.gridSize/board.height*100)}%`,backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)'}}></div>}
              {pieces.map(p=>(
                <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name} style={{position:'absolute',left:`${p.x/board.width*100}%`,top:`${p.y/board.height*100}%`,width:`${p.width/board.width*100}%`,height:`${p.height/board.height*100}%`,cursor:'grab',touchAction:'none'}}>
                  {p.shape==='image'&&p.imageUrl ? <img src={p.imageUrl} alt="" draggable="false" style={{width:'100%',height:'100%',pointerEvents:'none'}} /> : <div style={{width:'100%',height:'100%',boxShadow:'0 2px 6px rgba(0,0,0,.3)',border:'2px solid rgba(0,0,0,.2)',background:p.color,borderRadius:p.shape==='circle'?'50%':'18%'}}></div>}
                </div>
              ))}
            </div>
          </div>

          <div className="room-side scroll" style={{borderTop:'1px solid var(--line)',background:'rgba(23,23,23,.5)',display:'flex',flexDirection:'column'}}>
            {config.features?.enableDice && (
              <div style={{padding:16,borderBottom:'1px solid var(--line)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                  <div>
                    <div style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:800,color:'var(--faint)'}}>Dice</div>
                    {dice ? <div style={{color:'#fff',fontWeight:800,fontSize:'1.15rem'}}>{dice.values.join(' + ')}{dice.values.length>1?` = ${dice.values.reduce((a,b)=>a+b,0)}`:''}</div> : <div style={{color:'var(--faint)',fontSize:'.86rem'}}>Roll to start</div>}
                    {dice && <div style={{fontSize:'.7rem',color:'var(--faint)'}}>by {dice.rolledByName||'player'}</div>}
                  </div>
                  <button onClick={rollDice} style={{background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'9px 16px',borderRadius:11,border:0,cursor:'pointer',fontSize:'.88rem',transform:rolling?'rotate(12deg)':'none',transition:'transform .25s'}}>🎲 Roll</button>
                </div>
              </div>
            )}
            {config.features?.enableTurns && (room.players||[]).length>1 && (
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
                <button onClick={passTurn} disabled={!myTurn} style={{width:'100%',background:myTurn?'rgba(16,185,129,.15)':'rgba(255,255,255,.04)',color:myTurn?'var(--emerald-bright)':'var(--faint)',border:'1px solid var(--line)',borderRadius:11,padding:'10px',fontWeight:800,fontSize:'.86rem',cursor:myTurn?'pointer':'default'}}>{myTurn?'End my turn →':'Waiting for your turn'}</button>
              </div>
            )}
            <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:220}}>
              <div ref={chatRef} className="scroll" style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column',gap:7}}>
                {messages.length===0 && <div style={{color:'var(--faint)',fontSize:'.78rem',textAlign:'center',marginTop:18}}>Say hi 👋</div>}
                {messages.map(m=>(
                  <div key={m.id} style={{fontSize:'.86rem'}}><span style={{fontWeight:800,color:'var(--emerald-bright)'}}>{m.senderName}: </span><span style={{color:'#e5e5e5'}}>{m.text}</span></div>
                ))}
              </div>
              <form onSubmit={sendChat} style={{padding:12,borderTop:'1px solid var(--line)',display:'flex',gap:8}}>
                <input value={chat} onChange={e=>setChat(e.target.value)} placeholder="Message..." style={{flex:1,background:'#262626',border:'1px solid var(--line)',borderRadius:11,padding:'9px 12px',color:'#fff',fontSize:'.86rem',outline:'none'}} />
                <button type="submit" style={{background:'var(--emerald)',color:'#04231a',padding:'0 14px',borderRadius:11,border:0,fontWeight:800,cursor:'pointer'}}>Send</button>
              </form>
            </div>
          </div>
        </div>
        <style>{`@media(min-width:1000px){.room-wrap{flex-direction:row!important} .room-side{width:320px;border-top:0!important;border-left:1px solid var(--line)}}`}</style>
      </div>
    );
  }
  window.GBRoom = GBRoom;
})();
