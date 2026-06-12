// GameBash — live multiplayer Game Room. Exposes window.GBRoom.
// Real-time via Firestore: rooms/{id} doc + rooms/{id}/messages subcollection.
// Rules overlay at start · per-player scoreboard · host "Finish game" → winner celebration.
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
    const [showRules, setShowRules] = useState(false);
    const [showFinish, setShowFinish] = useState(false);
    const boardRef = useRef(null);
    const chatRef = useRef(null);
    const rulesShown = useRef(false);

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

    // Show rules once when the game config arrives (if the game has any)
    useEffect(()=>{
      if(config && !rulesShown.current){
        rulesShown.current = true;
        if(config.rules && (config.rules.howToPlay || config.rules.howToWin)) setShowRules(true);
      }
    }, [config]);

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
    const isHost = isAdmin || room.hostId===profile.uid;
    const scores = room.state?.scores || {};
    const winner = room.state?.winner;

    const onPiecePointerDown = (e, p)=>{
      if(winner) return;
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

    const bumpScore = (uid, delta)=>{
      if(winner) return;
      if(!(isHost || uid===profile.uid)) return;
      const next = Math.max(0, (scores[uid]||0) + delta);
      fbDb.collection('rooms').doc(roomId).update({ ['state.scores.'+uid]: next }).catch(e=>console.error(e));
    };

    const finishGame = (winUid)=>{
      const pl = (room.players||[]).find(p=>p.uid===winUid);
      if(!pl) return;
      fbDb.collection('rooms').doc(roomId).update({
        status:'finished',
        'state.winner':{ uid:pl.uid, name:pl.displayName, color:pl.color }
      }).then(()=>{
        fbDb.collection('rooms').doc(roomId).collection('messages').add({ senderId:profile.uid, senderName:'Game', text:`🏆 ${pl.displayName} wins!`, createdAt:fbTimestamp(), type:'system' }).catch(()=>{});
      }).catch(e=>{ console.error(e); window.gbToast('Could not finish the game.','error'); });
      setShowFinish(false);
    };

    const playAgain = ()=>{
      fbDb.collection('rooms').doc(roomId).update({
        status:'playing',
        'state.winner': firebase.firestore.FieldValue.delete(),
        'state.pieces': {},
        'state.scores': {},
        'state.diceResult': firebase.firestore.FieldValue.delete()
      }).catch(e=>console.error(e));
    };

    const sendChat = (e)=>{
      e.preventDefault();
      const text = chat.trim(); if(!text) return;
      setChat('');
      fbDb.collection('rooms').doc(roomId).collection('messages').add({ senderId:profile.uid, senderName:profile.displayName, text, createdAt:fbTimestamp(), type:'chat' })
        .catch(err=>{ console.error(err); window.gbToast('Message not sent.','error'); });
    };

    const endRoom = async ()=>{
      if(!confirm('Close this room for everyone?')) return;
      try{ await fbDb.collection('rooms').doc(roomId).delete(); }catch(e){ console.error(e); }
      onLeave();
    };

    const dice = room.state?.diceResult;
    const turnPlayer = (room.players||[]).find(p=>p.uid===room.state?.turn);
    const ranked = [...(room.players||[])].sort((a,b)=>(scores[b.uid]||0)-(scores[a.uid]||0));
    const hasRules = config.rules && (config.rules.howToPlay || config.rules.howToWin);

    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>

        {/* ── rules overlay ── */}
        {showRules && hasRules && (
          <div onClick={()=>setShowRules(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.78)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{maxWidth:480,width:'100%',background:'var(--panel)',border:'1px solid rgba(16,185,129,.35)',borderRadius:20,padding:'24px 26px'}}>
              <h2 style={{color:'#fff',fontSize:'1.2rem',fontWeight:800,marginBottom:14}}>📜 How this game works</h2>
              {config.rules.howToPlay && (<div style={{marginBottom:14}}>
                <div style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:800,color:'var(--emerald-bright)',marginBottom:5}}>How to play</div>
                <div style={{color:'var(--text)',fontSize:'.92rem',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{config.rules.howToPlay}</div>
              </div>)}
              {config.rules.howToWin && (<div style={{marginBottom:16}}>
                <div style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:800,color:'var(--amber)',marginBottom:5}}>How to win</div>
                <div style={{color:'var(--text)',fontSize:'.92rem',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{config.rules.howToWin}</div>
              </div>)}
              <button onClick={()=>setShowRules(false)} style={{width:'100%',background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'11px',borderRadius:12,border:0,cursor:'pointer',fontSize:'.92rem'}}>Let's play</button>
            </div>
          </div>
        )}

        {/* ── pick-the-winner overlay (host) ── */}
        {showFinish && !winner && (
          <div onClick={()=>setShowFinish(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.78)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{maxWidth:420,width:'100%',background:'var(--panel)',border:'1px solid rgba(251,191,36,.4)',borderRadius:20,padding:'24px 26px'}}>
              <h2 style={{color:'#fff',fontSize:'1.2rem',fontWeight:800,marginBottom:4}}>🏁 Finish the game</h2>
              <p style={{color:'var(--muted)',fontSize:'.84rem',marginBottom:14}}>Who won? (Sorted by score.)</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {ranked.map(pl=>(
                  <button key={pl.uid} onClick={()=>finishGame(pl.uid)} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.04)',border:'1px solid var(--line)',borderRadius:12,padding:'11px 14px',cursor:'pointer',textAlign:'left'}}>
                    <span style={{width:28,height:28,borderRadius:'50%',background:pl.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:800,color:'#fff',flexShrink:0}}>{pl.displayName?.[0]?.toUpperCase()||'?'}</span>
                    <span style={{flex:1,color:'#fff',fontWeight:700,fontSize:'.92rem'}}>{pl.displayName}</span>
                    <span style={{color:'var(--amber)',fontWeight:800,fontSize:'.92rem'}}>{scores[pl.uid]||0} pts</span>
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowFinish(false)} style={{marginTop:14,width:'100%',background:'rgba(255,255,255,.05)',color:'var(--muted)',fontWeight:700,padding:'10px',borderRadius:12,border:'1px solid var(--line)',cursor:'pointer',fontSize:'.86rem'}}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── winner celebration ── */}
        {winner && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:160,display:'flex',alignItems:'center',justifyContent:'center',padding:20,overflow:'hidden'}}>
            {Array.from({length:26}).map((_,i)=>(
              <span key={i} style={{position:'absolute',top:'-30px',left:(i*3.9+2)+'%',width:9,height:15,background:['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#ec4899'][i%6],animation:`gbconf ${2.4+(i%5)*.5}s ${(i%7)*.32}s linear infinite`,borderRadius:2}}></span>
            ))}
            <div style={{textAlign:'center',position:'relative'}}>
              <div style={{fontSize:'4.5rem',marginBottom:6}}>🏆</div>
              <div style={{fontSize:'2.2rem',fontWeight:900,color:winner.color||'#fff',marginBottom:4}}>{winner.name} wins!</div>
              <div style={{color:'var(--muted)',fontSize:'.95rem',marginBottom:22}}>Final scores</div>
              <div style={{display:'flex',flexDirection:'column',gap:7,maxWidth:320,margin:'0 auto 26px'}}>
                {ranked.map((pl,i)=>(
                  <div key={pl.uid} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.05)',border:'1px solid '+(pl.uid===winner.uid?'rgba(251,191,36,.5)':'var(--line)'),borderRadius:12,padding:'9px 14px'}}>
                    <span style={{color:'var(--faint)',fontWeight:800,fontSize:'.82rem',width:18}}>{i+1}.</span>
                    <span style={{flex:1,color:'#fff',fontWeight:700,fontSize:'.9rem',textAlign:'left'}}>{pl.displayName}</span>
                    <span style={{color:'var(--amber)',fontWeight:800,fontSize:'.9rem'}}>{scores[pl.uid]||0} pts</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                {isHost && <button onClick={playAgain} style={{background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'12px 22px',borderRadius:12,border:0,cursor:'pointer',fontSize:'.95rem'}}>Play again</button>}
                <button onClick={onLeave} style={{background:'rgba(255,255,255,.07)',color:'#fff',fontWeight:800,padding:'12px 22px',borderRadius:12,border:'1px solid var(--line)',cursor:'pointer',fontSize:'.95rem'}}>Back to lobby</button>
              </div>
            </div>
            <style>{`@keyframes gbconf{to{transform:translateY(110vh) rotate(540deg)}}`}</style>
          </div>
        )}

        {/* ── top bar ── */}
        <div style={{height:56,borderBottom:'1px solid var(--line)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(23,23,23,.55)'}}>
          <button onClick={onLeave} style={{display:'flex',alignItems:'center',gap:7,color:'var(--muted)',background:'none',border:0,cursor:'pointer',fontWeight:700,fontSize:'.9rem'}}>
            <span style={{transform:'rotate(180deg)',display:'inline-flex'}}><I name="arrowRight" /></span> Leave
          </button>
          {config.features?.enableTurns && turnPlayer && (
            <div style={{fontSize:'.84rem',color:'var(--muted)'}}>Turn: <strong style={{color:turnPlayer.color}}>{turnPlayer.displayName}</strong></div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {hasRules && <button onClick={()=>setShowRules(true)} title="Show the rules" style={{fontSize:'.78rem',fontWeight:700,color:'var(--text)',background:'rgba(255,255,255,.05)',border:'1px solid var(--line)',borderRadius:9,padding:'7px 11px',cursor:'pointer'}}>📜 Rules</button>}
            <div style={{display:'flex',marginRight:4}}>
              {(room.players||[]).map((pl,i)=>(
                <div key={pl.uid} title={pl.displayName} style={{width:30,height:30,borderRadius:'50%',border:'2px solid #0a0a0a',marginLeft:i?-8:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.72rem',fontWeight:800,color:'#fff',background:pl.color}}>{pl.displayName?.[0]?.toUpperCase()||'?'}</div>
              ))}
            </div>
            {isHost && !winner && <button onClick={()=>setShowFinish(true)} style={{fontSize:'.78rem',fontWeight:800,color:'#04231a',background:'var(--amber)',border:0,borderRadius:9,padding:'7px 12px',cursor:'pointer'}}>🏁 Finish game</button>}
            {isHost && <button onClick={endRoom} title="Close this room for everyone" style={{fontSize:'.78rem',fontWeight:700,color:'var(--red)',background:'rgba(255,255,255,.05)',border:'1px solid var(--line)',borderRadius:9,padding:'7px 11px',cursor:'pointer'}}>End</button>}
          </div>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column'}} className="room-wrap">
          <div className="scroll" style={{flex:1,overflow:'auto',padding:24,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
            <div ref={boardRef} style={{position:'relative',borderRadius:12,boxShadow:'0 20px 50px rgba(0,0,0,.5)',flexShrink:0,width:'min(100%, '+board.width+'px)',aspectRatio:board.width+'/'+board.height,backgroundColor:board.backgroundColor,backgroundImage:board.backgroundImage?`url("${board.backgroundImage}")`:undefined,backgroundSize:'cover'}}>
              {board.gridSize>0 && <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundSize:`${(board.gridSize/board.width*100)}% ${(board.gridSize/board.height*100)}%`,backgroundImage:'linear-gradient(to right, rgba(128,128,128,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,.18) 1px, transparent 1px)'}}></div>}
              {pieces.map(p=>(
                <div key={p.id} onPointerDown={(e)=>onPiecePointerDown(e,p)} title={p.name} style={{position:'absolute',left:`${p.x/board.width*100}%`,top:`${p.y/board.height*100}%`,width:`${p.width/board.width*100}%`,height:`${p.height/board.height*100}%`,cursor:winner?'default':'grab',touchAction:'none'}}>
                  {p.shape==='image'&&p.imageUrl ? <img src={p.imageUrl} alt="" draggable="false" style={{width:'100%',height:'100%',pointerEvents:'none',borderRadius:p.imageUrl.startsWith('data:')?'12%':0}} /> : <div style={{width:'100%',height:'100%',boxShadow:'0 2px 6px rgba(0,0,0,.3)',border:'2px solid rgba(0,0,0,.2)',background:p.color,borderRadius:p.shape==='circle'?'50%':'18%'}}></div>}
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
                  <button onClick={rollDice} disabled={!!winner} style={{background:'var(--emerald)',color:'#04231a',fontWeight:800,padding:'9px 16px',borderRadius:11,border:0,cursor:'pointer',fontSize:'.88rem',transform:rolling?'rotate(12deg)':'none',transition:'transform .25s',opacity:winner?.5:1}}>🎲 Roll</button>
                </div>
              </div>
            )}

            {/* scoreboard */}
            <div style={{padding:16,borderBottom:'1px solid var(--line)'}}>
              <div style={{fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:800,color:'var(--faint)',marginBottom:9}}>Scoreboard</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {ranked.map(pl=>{
                  const canBump = !winner && (isHost || pl.uid===profile.uid);
                  return (
                    <div key={pl.uid} style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{width:22,height:22,borderRadius:'50%',background:pl.color,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'.62rem',fontWeight:800,color:'#fff',flexShrink:0}}>{pl.displayName?.[0]?.toUpperCase()||'?'}</span>
                      <span style={{flex:1,color:'#fff',fontSize:'.84rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pl.displayName}{pl.uid===profile.uid?' (you)':''}</span>
                      {canBump && <button onClick={()=>bumpScore(pl.uid,-1)} style={{width:24,height:24,borderRadius:7,background:'rgba(255,255,255,.06)',border:'1px solid var(--line)',color:'var(--muted)',cursor:'pointer',fontWeight:800,lineHeight:1}}>−</button>}
                      <span style={{color:'var(--amber)',fontWeight:800,fontSize:'.9rem',minWidth:26,textAlign:'center'}}>{scores[pl.uid]||0}</span>
                      {canBump && <button onClick={()=>bumpScore(pl.uid,1)} style={{width:24,height:24,borderRadius:7,background:'rgba(16,185,129,.14)',border:'1px solid rgba(16,185,129,.35)',color:'var(--emerald-bright)',cursor:'pointer',fontWeight:800,lineHeight:1}}>+</button>}
                    </div>
                  );
                })}
              </div>
            </div>

            {config.features?.enableTurns && (room.players||[]).length>1 && (
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--line)'}}>
                <button onClick={passTurn} disabled={!myTurn||!!winner} style={{width:'100%',background:myTurn?'rgba(16,185,129,.15)':'rgba(255,255,255,.04)',color:myTurn?'var(--emerald-bright)':'var(--faint)',border:'1px solid var(--line)',borderRadius:11,padding:'10px',fontWeight:800,fontSize:'.86rem',cursor:myTurn?'pointer':'default'}}>{myTurn?'End my turn →':'Waiting for your turn'}</button>
              </div>
            )}
            <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:200}}>
              <div ref={chatRef} className="scroll" style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column',gap:7}}>
                {messages.length===0 && <div style={{color:'var(--faint)',fontSize:'.78rem',textAlign:'center',marginTop:18}}>Say hi 👋</div>}
                {messages.map(m=>(
                  m.type==='system'
                    ? <div key={m.id} style={{fontSize:'.82rem',textAlign:'center',color:'var(--amber)',fontWeight:700}}>{m.text}</div>
                    : <div key={m.id} style={{fontSize:'.86rem'}}><span style={{fontWeight:800,color:'var(--emerald-bright)'}}>{m.senderName}: </span><span style={{color:'#e5e5e5'}}>{m.text}</span></div>
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
