// GameBash — main app (auth + lobby + routing). Single-file build, no bundler.
// Uses window.fbAuth / window.fbDb (compat) set up in index.html.
const { useState, useEffect, useRef } = React;

// ── tiny class joiner ──
function cn(){ return Array.from(arguments).filter(Boolean).join(' '); }

// ── minimal toast ──
function toast(msg, kind){
  const host = document.getElementById('gb-toasts') || (()=>{ const d=document.createElement('div'); d.id='gb-toasts'; d.className='fixed bottom-5 right-5 z-[200] flex flex-col gap-2'; document.body.appendChild(d); return d; })();
  const el = document.createElement('div');
  el.className = cn('px-4 py-3 rounded-xl text-sm font-semibold shadow-xl border',
    kind==='error' ? 'bg-red-950 text-red-200 border-red-800' : 'bg-neutral-800 text-white border-white/10');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 2600);
}
window.gbToast = toast;

// ── inline icon set (lucide-style) ──
const PATHS = {
  gamepad:'M6 12h4m-2-2v4M15 11h.01M18 13h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z',
  logout:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus:'M5 12h14M12 5v14',
  play:'M6 3l14 9-14 9V3z',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  sparkles:'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z',
  x:'M18 6 6 18M6 6l12 12',
  arrowRight:'M5 12h14M12 5l7 7-7 7',
  edit:'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z',
  trash:'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  info:'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
};
function Icon({ name, className, fill }){
  return (
    <svg viewBox="0 0 24 24" className={className||'w-5 h-5'} fill={fill||'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
window.GBIcon = Icon;

// ── App ──
function App(){
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('lobby');     // lobby | room | editor
  const [roomId, setRoomId] = useState(null);
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
            const p = { uid:u.uid, displayName:u.displayName || (isAdmin?'Teacher':'Guest Student'), photoURL:u.photoURL||null, email:u.email||'guest@classroom.local', role: isAdmin?'admin':'student' };
            await ref.set(p);
            setProfile(p);
          }
        }catch(e){ console.error(e); gbToast('Could not load your profile.','error'); }
      } else { setProfile(null); }
      setLoading(false);
    });
    return ()=>unsub();
  }, []);

  const loginGoogle = async ()=>{
    try{ await fbAuth.signInWithPopup(new window.GoogleProvider()); }
    catch(e){ console.error(e); gbToast('Google sign-in failed. Is this domain authorized in Firebase?','error'); }
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
    }catch(e){ console.error(e); gbToast('Could not join. Try again.','error'); }
    finally{ setBusy(false); }
  };
  const logout = ()=> fbAuth.signOut();

  if(loading){
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="gb-spin"></div></div>;
  }

  if(!user){
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto md:mx-0 mb-8 border border-emerald-500/20 text-emerald-500">
              <Icon name="gamepad" className="w-10 h-10" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">GameBash</h1>
            <p className="text-neutral-400 text-xl leading-relaxed">Build your own board &amp; card games. Share them. Play them with your class.</p>
          </div>
          <div className="space-y-8 bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5">
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Teacher Access</h2>
              <button onClick={loginGoogle} className="w-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-xl">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" /> Sign in with Google
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-4 text-neutral-500 font-bold">or</span></div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Student Access</h2>
              <form onSubmit={loginGuest} className="space-y-3">
                <input type="text" placeholder="Enter your name..." value={guestName} onChange={e=>setGuestName(e.target.value)} className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none" required />
                <button type="submit" disabled={busy || !guestName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3">
                  {busy?'Joining...':'Join as Student'} <Icon name="arrowRight" className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[10px] text-neutral-500 text-center uppercase tracking-widest">No account required</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin' || user.email === window.ADMIN_EMAIL;
  const GBRoom = window.GBRoom;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col">
      {view==='lobby' && (
        <nav className="border-b border-white/5 bg-neutral-900/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-neutral-900"><Icon name="gamepad" className="w-5 h-5" /></div>
              <span className="font-bold text-xl text-white tracking-tight">GameBash</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">{profile?.displayName}</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">{isAdmin?'Teacher':'Student'}</span>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Icon name="logout" /></button>
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 relative">
        {view==='lobby' && <Lobby profile={profile} isAdmin={isAdmin} onPlay={(rid)=>{ setRoomId(rid); setView('room'); }} />}
        {view==='room' && roomId && GBRoom && <GBRoom roomId={roomId} profile={profile} onLeave={()=>{ setView('lobby'); setRoomId(null); }} />}
      </main>
    </div>
  );
}

// ── Lobby ──
function Lobby({ profile, isAdmin, onPlay }){
  const [games, setGames] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [seeding, setSeeding] = useState(false);

  useEffect(()=>{
    const unsubGames = fbDb.collection('games').where('status','==','approved')
      .onSnapshot(s=> setGames(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
    const unsubRooms = fbDb.collection('rooms').where('status','in',['lobby','playing'])
      .onSnapshot(s=> setRooms(s.docs.map(d=>({id:d.id, ...d.data()}))), e=>console.error(e));
    return ()=>{ unsubGames(); unsubRooms(); };
  }, []);

  const seedDemos = async ()=>{
    setSeeding(true);
    try{
      for(const s of window.GB_STARTERS){
        await fbDb.collection('games').add({
          name:s.name, description:s.description, creatorId:profile.uid, creatorName:profile.displayName,
          createdAt:fbTimestamp(), updatedAt:fbTimestamp(), config:s.config, status:'approved', isPublic:true,
        });
      }
      gbToast('Demo games added!');
    }catch(e){ console.error(e); gbToast('Seeding failed — check permissions.','error'); }
    finally{ setSeeding(false); }
  };

  const startRoom = async (game)=>{
    try{
      const color = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316'][Math.floor(Math.random()*6)];
      const player = { uid:profile.uid, displayName:profile.displayName, photoURL:profile.photoURL||null, color };
      const ref = await fbDb.collection('rooms').add({
        gameId:game.id, hostId:profile.uid, status:'lobby',
        players:[player], playerUids:[profile.uid],
        state:{ pieces:{}, scores:{}, turn:profile.uid, currentDeck:[], discardPile:[] },
        createdAt:fbTimestamp(),
      });
      onPlay(ref.id);
    }catch(e){ console.error(e); gbToast('Could not start the game.','error'); }
  };

  const gameById = (id)=> games.find(g=>g.id===id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* Active rooms */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Icon name="users" className="w-6 h-6 text-emerald-500" /> Active Games</h2>
        </div>
        {rooms.length===0 ? (
          <div className="text-neutral-500 text-sm bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center">No games running yet. Start one below.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(r=>{
              const g = gameById(r.gameId);
              return (
                <button key={r.id} onClick={()=>onPlay(r.id)} className="text-left bg-neutral-900 hover:bg-neutral-800 border border-white/5 hover:border-emerald-500/40 rounded-2xl p-5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">{r.status==='lobby'?'Waiting':'Playing'}</span>
                    <span className="text-xs text-neutral-500">{r.players?.length||0} player{(r.players?.length||0)===1?'':'s'}</span>
                  </div>
                  <h3 className="font-bold text-white">{g?.name || 'Game'}</h3>
                  <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm font-semibold"><Icon name="play" className="w-4 h-4" fill="currentColor" /> Join</div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Game templates */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Icon name="sparkles" className="w-6 h-6 text-emerald-500" /> Games</h2>
          {isAdmin && (
            <button onClick={seedDemos} disabled={seeding} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
              <Icon name="plus" className="w-4 h-4" /> {seeding?'Adding...':'Make demo games'}
            </button>
          )}
        </div>
        {games.length===0 ? (
          <div className="text-neutral-500 text-sm bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center">
            No games yet.{isAdmin ? ' Click “Make demo games” to add the starter set.' : ' Ask your teacher to add some.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map(g=>(
              <div key={g.id} className="group bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="aspect-[16/9] relative" style={{backgroundColor:g.config?.board?.backgroundColor, backgroundImage:g.config?.board?.backgroundImage?`url("${g.config.board.backgroundImage}")`:undefined, backgroundSize:'cover', backgroundPosition:'center'}}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white">{g.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed line-clamp-2">{g.description}</p>
                  <button onClick={()=>startRoom(g)} className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                    <Icon name="play" className="w-4 h-4" fill="currentColor" /> Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
