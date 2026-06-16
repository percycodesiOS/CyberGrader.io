// GameBash — main app: auth (Google teacher + name-only student), lobby,
// classroom dashboard, routing. Uses window.fbAuth / window.fbDb (compat).
const { useState, useEffect, useRef } = React;

function cn(){ return Array.from(arguments).filter(Boolean).join(' '); }

// ── toast ──
function toast(msg, kind){
  const host = document.getElementById('gb-toasts') || (()=>{ const d=document.createElement('div'); d.id='gb-toasts'; d.style.cssText='position:fixed;bottom:18px;right:18px;z-index:300;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(d); return d; })();
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = `padding:12px 16px;border-radius:12px;font-size:.9rem;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.5);border:1px solid ${kind==='error'?'rgba(248,113,113,.4)':'rgba(255,255,255,.1)'};background:${kind==='error'?'#3b1212':'#262626'};color:${kind==='error'?'#fecaca':'#fff'}`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 2600);
}
window.gbToast = toast;

// ── icon set ──
const PATHS = {
  gamepad:'M6 12h4m-2-2v4M15 11h.01M18 13h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z',
  logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus:'M5 12h14M12 5v14',
  play:'M6 3l14 9-14 9V3z',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  sparkles:'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z',
  arrowRight:'M5 12h14M12 5l7 7-7 7',
  edit:'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z',
  trash:'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  check:'M20 6 9 17l-5-5',
  clock:'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  layout:'M3 3h18v18H3zM3 9h18M9 21V9',
  hourglass:'M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2',
};
function Icon({ name, className, fill }){
  return (<svg viewBox="0 0 24 24" className={className||''} width="20" height="20" fill={fill||'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={PATHS[name]} /></svg>);
}
window.GBIcon = Icon;

const PLAYER_COLORS = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316','#ec4899','#06b6d4'];

// ── App root ──
function App(){
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('lobby');   // lobby | room | editor | dashboard
  const [roomId, setRoomId] = useState(null);
  const [editGame, setEditGame] = useState(null);  // null=new, object=edit existing
  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(()=>{
    const unsub = fbAuth.onAuthStateChanged(async (u)=>{
      setUser(u);
      if(u){
        try{
          const ref = fbDb.collection('users').doc(u.uid);
          const snap = await ref.get();
          if(snap.exists){ setProfile(snap.data()); }
          else{
            const isAdmin = u.email === window.ADMIN_EMAIL;
            const p = { uid:u.uid, displayName:u.displayName || (isAdmin?'Teacher':'Student'), photoURL:u.photoURL||null, email:u.email||'guest@classroom.local', role: isAdmin?'admin':'student' };
            await ref.set(p);
            setProfile(p);
          }
        }catch(e){ console.error(e); toast('Could not load your profile.','error'); }
      } else { setProfile(null); }
      setLoading(false);
    });
    return ()=>unsub();
  }, []);

  const loginGoogle = async ()=>{
    try{ await fbAuth.signInWithPopup(new window.GoogleProvider()); }
    catch(e){ console.error(e); toast(e.code==='auth/unauthorized-domain' ? 'This web address is not authorized in Firebase yet.' : 'Google sign-in failed.', 'error'); }
  };
  const loginGuest = async (e)=>{
    e.preventDefault();
    if(!guestName.trim()) return;
    setBusy(true);
    try{
      const { user:anon } = await fbAuth.signInAnonymously();
      await anon.updateProfile({ displayName: guestName.trim() });
      const p = { uid:anon.uid, displayName:guestName.trim(), photoURL:null, email:'guest@classroom.local', role:'student' };
      await fbDb.collection('users').doc(anon.uid).set(p);
      setProfile(p);
    }catch(e){ console.error(e); toast('Could not join. Try again.','error'); }
    finally{ setBusy(false); }
  };
  const logout = ()=> fbAuth.signOut();

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="gb-spin"></div></div>;
  if(!user) return <LoginScreen guestName={guestName} setGuestName={setGuestName} loginGoogle={loginGoogle} loginGuest={loginGuest} busy={busy} />;

  const isAdmin = profile?.role === 'admin' || user.email === window.ADMIN_EMAIL;
  const goLobby = ()=>{ setView('lobby'); setRoomId(null); setEditGame(null); };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {view!=='room' && view!=='editor' && (
        <TopBar profile={profile} isAdmin={isAdmin} view={view} setView={setView} onLogout={logout} />
      )}
      <main style={{flex:1,position:'relative'}}>
        {view==='lobby' && <Lobby profile={profile} isAdmin={isAdmin}
          onPlay={(rid)=>{ setRoomId(rid); setView('room'); }}
          onCreate={()=>{ setEditGame(null); setView('editor'); }}
          onEdit={(g)=>{ setEditGame(g); setView('editor'); }} />}
        {view==='dashboard' && isAdmin && <ClassroomDashboard onBack={goLobby} />}
        {view==='room' && roomId && window.GBRoom && <window.GBRoom roomId={roomId} profile={profile} isAdmin={isAdmin} onLeave={goLobby} />}
        {view==='editor' && window.GBEditor && <window.GBEditor profile={profile} isAdmin={isAdmin} existing={editGame} onClose={goLobby} />}
      </main>
    </div>
  );
}

// ── Login ──
function LoginScreen({ guestName, setGuestName, loginGoogle, loginGuest, busy }){
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:920,width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center'}} className="login-grid">
        <div>
          <div style={{width:76,height:76,background:'rgba(16,185,129,.12)',borderRadius:22,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:26,border:'1px solid rgba(16,185,129,.25)',color:'var(--emerald)'}}>
            <Icon name="gamepad" className="" />
          </div>
          <h1 style={{fontSize:'3.4rem',fontWeight:900,letterSpacing:'-.03em',marginBottom:14,color:'#fff',lineHeight:1.05}}>GameBash</h1>
          <p style={{color:'var(--muted)',fontSize:'1.18rem',lineHeight:1.55,maxWidth:380}}>Build your own board &amp; card games, then play them live with your class. Private to your classroom.</p>
        </div>
        <div style={{background:'rgba(23,23,23,.6)',padding:32,borderRadius:26,border:'1px solid var(--line)',display:'flex',flexDirection:'column',gap:28}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--faint)',textTransform:'uppercase',letterSpacing:'.2em'}}>Teacher</div>
            <button onClick={loginGoogle} style={{width:'100%',background:'#fff',color:'#0a0a0a',fontWeight:800,padding:'15px 22px',borderRadius:16,border:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:12,fontSize:'1rem'}}>
              <img src="https://www.google.com/favicon.ico" width="20" height="20" alt="" /> Sign in with Google
            </button>
          </div>
          <div style={{position:'relative',textAlign:'center'}}>
            <div style={{borderTop:'1px solid var(--line)',position:'absolute',top:'50%',left:0,right:0}}></div>
            <span style={{position:'relative',background:'#1a1a1a',padding:'0 14px',color:'var(--faint)',fontSize:'.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.15em'}}>or</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--faint)',textTransform:'uppercase',letterSpacing:'.2em'}}>Student</div>
            <form onSubmit={loginGuest} style={{display:'flex',flexDirection:'column',gap:12}}>
              <input type="text" placeholder="Enter your name..." value={guestName} onChange={e=>setGuestName(e.target.value)} required
                style={{width:'100%',background:'#262626',border:'1px solid var(--line)',borderRadius:16,padding:'15px 20px',color:'#fff',fontSize:'1rem',outline:'none'}} />
              <button type="submit" disabled={busy||!guestName.trim()} style={{width:'100%',background:busy?'#0d6b4e':'var(--emerald)',color:'#fff',fontWeight:800,padding:'15px 22px',borderRadius:16,border:0,cursor:busy?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontSize:'1rem',opacity:(!guestName.trim())?.5:1}}>
                {busy?'Joining...':'Join as Student'} <Icon name="arrowRight" />
              </button>
            </form>
            <p style={{fontSize:'.7rem',color:'var(--faint)',textAlign:'center',textTransform:'uppercase',letterSpacing:'.12em'}}>No account needed</p>
          </div>
          <a href="../index.html" style={{color:'var(--faint)',fontSize:'.82rem',textAlign:'center',textDecoration:'none'}}>← Back to CyberGrader</a>
        </div>
      </div>
      <style>{`@media(max-width:760px){.login-grid{grid-template-columns:1fr!important;gap:28px!important}}`}</style>
    </div>
  );
}

// ── Top bar ──
function TopBar({ profile, isAdmin, view, setView, onLogout }){
  return (
    <nav style={{borderBottom:'1px solid var(--line)',background:'rgba(23,23,23,.55)',backdropFilter:'blur(8px)',position:'sticky',top:0,zIndex:40}}>
      <div style={{maxWidth:1180,margin:'0 auto',padding:'0 22px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>setView('lobby')} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:0,cursor:'pointer'}}>
          <span style={{width:32,height:32,borderRadius:9,background:'var(--emerald)',color:'#052e22',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>G</span>
          <span style={{fontWeight:800,fontSize:'1.18rem',color:'#fff',letterSpacing:'-.01em'}}>GameBash</span>
        </button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {isAdmin && (
            <button onClick={()=>setView(view==='dashboard'?'lobby':'dashboard')} style={{display:'flex',alignItems:'center',gap:7,background:view==='dashboard'?'rgba(16,185,129,.15)':'rgba(255,255,255,.05)',border:'1px solid var(--line)',color:view==='dashboard'?'var(--emerald-bright)':'var(--muted)',padding:'8px 13px',borderRadius:11,cursor:'pointer',fontWeight:700,fontSize:'.86rem'}}>
              <Icon name="users" /> Classroom
            </button>
          )}
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px',background:'rgba(255,255,255,.05)',borderRadius:999,border:'1px solid var(--line)'}}>
            <img src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName)}&backgroundColor=10b981`} width="26" height="26" style={{borderRadius:'50%'}} referrerPolicy="no-referrer" alt="" />
            <div style={{display:'flex',flexDirection:'column',lineHeight:1.1}}>
              <span style={{fontSize:'.82rem',fontWeight:800,color:'#fff'}}>{profile.displayName}</span>
              <span style={{fontSize:'.62rem',color:'var(--emerald-bright)',fontWeight:800,textTransform:'uppercase',letterSpacing:'.05em'}}>{isAdmin?'Teacher':'Student'}</span>
            </div>
          </div>
          <button onClick={onLogout} title="Sign out" style={{padding:9,color:'var(--muted)',background:'none',border:0,cursor:'pointer',borderRadius:9}}><Icon name="logout" /></button>
        </div>
      </div>
    </nav>
  );
}

// ── Classroom dashboard ──
function ClassroomDashboard({ onBack }){
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fbDb.collection('users').get()
      .then(s=> setStudents(s.docs.map(d=>d.data())))
      .catch(e=>{ console.error(e); toast('Could not load the class list.','error'); })
      .finally(()=>setLoading(false));
  }, []);
  return (
    <div style={{maxWidth:1180,margin:'0 auto',padding:'40px 22px'}}>
      <h2 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:10,marginBottom:22}}><Icon name="users" /> Classroom</h2>
      {loading ? <div className="gb-spin"></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
          {students.filter(s=>s.role!=='admin').length===0 && <div style={{color:'var(--faint)'}}>No students have joined yet.</div>}
          {students.filter(s=>s.role!=='admin').map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'var(--panel)',border:'1px solid var(--line)',borderRadius:16,padding:'14px 16px'}}>
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.displayName)}&backgroundColor=10b981`} width="38" height="38" style={{borderRadius:'50%'}} alt="" />
              <div style={{fontWeight:700,color:'#fff'}}>{s.displayName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lobby ──
function Lobby({ profile, isAdmin, onPlay, onCreate, onEdit }){
  const [games, setGames] = useState([]);
  const [pending, setPending] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(()=>{
    const unsubGames = fbDb.collection('games').where('status','==','approved')
      .onSnapshot(s=> setGames(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
    const unsubRooms = fbDb.collection('rooms').where('status','in',['lobby','playing'])
      .onSnapshot(s=> setRooms(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
    return ()=>{ unsubGames(); unsubRooms(); };
  }, []);

  // teacher sees pending student submissions
  useEffect(()=>{
    if(!isAdmin) return;
    const unsub = fbDb.collection('games').where('status','==','pending')
      .onSnapshot(s=> setPending(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
    return ()=>unsub();
  }, [isAdmin]);

  const seedDemos = async ()=>{
    setSeeding(true);
    try{
      const existing = new Set(games.map(g=>g.name));
      let added = 0;
      for(const s of window.GB_STARTERS){
        if(existing.has(s.name)) continue;
        await fbDb.collection('games').add({ name:s.name, description:s.description, creatorId:profile.uid, creatorName:profile.displayName, createdAt:fbTimestamp(), updatedAt:fbTimestamp(), config:s.config, status:'approved', isPublic:true });
        added++;
      }
      toast(added ? `Added ${added} starter game${added===1?'':'s'}.` : 'Starter games are already here.');
    }catch(e){ console.error(e); toast('Seeding failed — check permissions.','error'); }
    finally{ setSeeding(false); }
  };

  const startRoom = async (game)=>{
    try{
      const color = PLAYER_COLORS[Math.floor(Math.random()*PLAYER_COLORS.length)];
      const player = { uid:profile.uid, displayName:profile.displayName, photoURL:profile.photoURL||null, color };
      const ref = await fbDb.collection('rooms').add({ gameId:game.id, hostId:profile.uid, status:'lobby', players:[player], playerUids:[profile.uid], state:{ pieces:{}, scores:{}, turn:profile.uid }, createdAt:fbTimestamp() });
      onPlay(ref.id);
    }catch(e){ console.error(e); toast('Could not start the game.','error'); }
  };

  const approve = async (g)=>{ try{ await fbDb.collection('games').doc(g.id).update({ status:'approved', isPublic:true, updatedAt:fbTimestamp() }); toast('Game approved.'); }catch(e){ console.error(e); toast('Could not approve.','error'); } };
  const reject = async (g)=>{ if(!confirm(`Reject "${g.name}"?`)) return; try{ await fbDb.collection('games').doc(g.id).delete(); toast('Rejected.'); }catch(e){ console.error(e); toast('Could not reject.','error'); } };
  const deleteGame = async (g)=>{ if(!confirm(`Delete "${g.name}" for everyone?`)) return; try{ await fbDb.collection('games').doc(g.id).delete(); toast('Deleted.'); }catch(e){ console.error(e); toast('Could not delete.','error'); } };
  const tidyDuplicates = async ()=>{
    const seen=new Set(); const dups=[];
    for(const g of games){ if(seen.has(g.name)) dups.push(g); else seen.add(g.name); }
    if(!dups.length){ toast('No duplicates found.'); return; }
    if(!confirm(`Remove ${dups.length} duplicate${dups.length===1?'':'s'}? (keeps one of each)`)) return;
    try{ for(const d of dups) await fbDb.collection('games').doc(d.id).delete(); toast(`Removed ${dups.length}.`); }catch(e){ console.error(e); toast('Cleanup failed.','error'); }
  };

  const gameById = (id)=> games.find(g=>g.id===id);
  const SectionLabel = ({icon,children,extra})=>(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:9}}><span style={{color:'var(--emerald)'}}><Icon name={icon} /></span> {children}</h2>
      {extra}
    </div>
  );
  const btn = (bg,color)=>({display:'flex',alignItems:'center',gap:7,background:bg,color,border:bg.includes('rgba')||bg==='transparent'?'1px solid var(--line)':0,fontWeight:800,fontSize:'.84rem',padding:'9px 14px',borderRadius:12,cursor:'pointer'});

  return (
    <div style={{maxWidth:1180,margin:'0 auto',padding:'34px 22px 70px',display:'flex',flexDirection:'column',gap:42}}>

      {/* Teacher approval queue */}
      {isAdmin && pending.length>0 && (
        <section>
          <SectionLabel icon="hourglass">Waiting for your approval</SectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {pending.map(g=>(
              <div key={g.id} style={{background:'var(--panel)',border:'1px solid rgba(251,191,36,.35)',borderRadius:18,overflow:'hidden'}}>
                <BoardThumb config={g.config} />
                <div style={{padding:16}}>
                  <h3 style={{fontWeight:800,color:'#fff'}}>{g.name}</h3>
                  <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:3}}>by {g.creatorName}</p>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={()=>approve(g)} style={{...btn('var(--emerald)','#04231a'),flex:1,justifyContent:'center'}}><Icon name="check" /> Approve</button>
                    <button onClick={()=>reject(g)} style={btn('rgba(255,255,255,.05)','var(--red)')}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active rooms */}
      <section>
        <SectionLabel icon="play">Games in progress</SectionLabel>
        {rooms.length===0 ? (
          <div style={{color:'var(--faint)',fontSize:'.9rem',background:'rgba(23,23,23,.4)',border:'1px solid var(--line)',borderRadius:16,padding:'24px',textAlign:'center'}}>Nothing running right now. Start one below.</div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
            {rooms.map(r=>{ const g=gameById(r.gameId); return (
              <button key={r.id} onClick={()=>onPlay(r.id)} style={{textAlign:'left',background:'var(--panel)',border:'1px solid var(--line)',borderRadius:16,padding:18,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:'.7rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:'var(--emerald-bright)'}}>{r.status==='lobby'?'Waiting':'Playing'}</span>
                  <span style={{fontSize:'.74rem',color:'var(--faint)'}}>{r.players?.length||0} player{(r.players?.length||0)===1?'':'s'}</span>
                </div>
                <div style={{fontWeight:800,color:'#fff'}}>{g?.name||'Game'}</div>
                <div style={{marginTop:10,color:'var(--emerald-bright)',fontSize:'.86rem',fontWeight:700,display:'flex',alignItems:'center',gap:6}}><Icon name="play" fill="currentColor" /> Join</div>
              </button>
            );})}
          </div>
        )}
      </section>

      {/* Build / templates */}
      <section>
        <SectionLabel icon="sparkles" extra={
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={onCreate} style={btn('var(--emerald)','#04231a')}><Icon name="plus" /> Build a game</button>
            {isAdmin && <button onClick={seedDemos} disabled={seeding} style={btn('rgba(255,255,255,.05)','#fff')}>{seeding?'Adding...':'Add starters'}</button>}
            {isAdmin && games.length>0 && <button onClick={tidyDuplicates} style={btn('rgba(255,255,255,.05)','var(--muted)')}><Icon name="trash" /> Tidy</button>}
          </div>
        }>Games to play</SectionLabel>
        {games.length===0 ? (
          <div style={{color:'var(--faint)',fontSize:'.9rem',background:'rgba(23,23,23,.4)',border:'1px solid var(--line)',borderRadius:16,padding:'24px',textAlign:'center'}}>
            No games yet. {isAdmin ? 'Click "Add starters" for the ready-made set, or "Build a game" to make your own.' : 'Build one, or ask your teacher to add some.'}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
            {games.map(g=>(
              <div key={g.id} className="gb-card" style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,overflow:'hidden'}}>
                <BoardThumb config={g.config} />
                <div style={{padding:16}}>
                  <h3 style={{fontWeight:800,color:'#fff'}}>{g.name}</h3>
                  <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:4,lineHeight:1.5,minHeight:36}}>{g.description}</p>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    <button onClick={()=>startRoom(g)} style={{...btn('var(--emerald)','#04231a'),flex:1,justifyContent:'center'}}><Icon name="play" fill="currentColor" /> Play</button>
                    {(isAdmin || g.creatorId===profile.uid) && <button onClick={()=>onEdit(g)} title="Edit" style={btn('rgba(255,255,255,.05)','var(--muted)')}><Icon name="edit" /></button>}
                    {(isAdmin || g.creatorId===profile.uid) && <button onClick={()=>deleteGame(g)} title="Delete" style={btn('rgba(255,255,255,.05)','var(--red)')}><Icon name="trash" /></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Built-in quick games */}
      <section>
        <SectionLabel icon="gamepad">Quick games (no setup)</SectionLabel>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16}}>
          {(window.GB_BUILTINS||[]).map(b=>(
            <a key={b.id} href={b.href} className="gb-card" style={{background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,overflow:'hidden',textDecoration:'none',color:'inherit',display:'block'}}>
              <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'3.4rem',background:'radial-gradient(circle at 50% 35%, #1f3b30, #0f1f19)'}}>{b.emoji}</div>
              <div style={{padding:16}}>
                <h3 style={{fontWeight:800,color:'#fff'}}>{b.name}</h3>
                <p style={{fontSize:'.8rem',color:'var(--muted)',marginTop:4,lineHeight:1.5,minHeight:36}}>{b.description}</p>
                <div style={{marginTop:10,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:'.7rem',fontWeight:800,padding:'4px 9px',borderRadius:999,background:'var(--panel2)',color:'var(--muted)',border:'1px solid var(--line)'}}>{b.tag}</span>
                  <span style={{marginLeft:'auto',color:'var(--emerald-bright)',fontWeight:800,fontSize:'.84rem'}}>Play →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <style>{`.gb-card{transition:transform .16s, border-color .16s} .gb-card:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.4)}`}</style>
    </div>
  );
}

// ── small board thumbnail ──
function BoardThumb({ config }){
  const b = config?.board || {};
  return (
    <div style={{aspectRatio:'16/9',position:'relative',backgroundColor:b.backgroundColor||'#1f1f1f',backgroundImage:b.backgroundImage?`url("${b.backgroundImage}")`:undefined,backgroundSize:'cover',backgroundPosition:'center'}}>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top, rgba(0,0,0,.55), transparent)'}}></div>
      {(config?.pieces||[]).slice(0,6).map((p,i)=>(
        <div key={i} style={{position:'absolute',left:`${8+i*14}%`,top:'52%',width:18,height:18,borderRadius:p.shape==='circle'||p.shape==='image'?'50%':4,background:p.color,boxShadow:'0 2px 5px rgba(0,0,0,.5)'}}></div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
