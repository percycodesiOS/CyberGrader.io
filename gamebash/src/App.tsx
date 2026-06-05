import React, { useState, useEffect } from 'react';
import { auth, db, signInAnonymously, handleFirestoreError, OperationType } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  onSnapshot, 
  where,
  Timestamp
} from 'firebase/firestore';
import { GameTemplate, UserProfile } from './types';
import { DEFAULT_GAMES } from './seedData';
import { STARTER_GAMES, StarterGame } from './data/presets';
import { Layout, Plus, Play, Edit, LogOut, User as UserIcon, Gamepad2, Layers, Users, ArrowRight, Sparkles, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Toaster } from 'sonner';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { Editor } from './components/Editor';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { ClassroomDashboard } from './components/ClassroomDashboard';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'lobby' | 'editor' | 'room' | 'classroom'>('lobby');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<StarterGame | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Check if this is the master admin email
          const isAdminEmail = firebaseUser.email === 'kmacek715@gmail.com';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || (isAdminEmail ? 'Teacher' : 'Guest Student'),
            photoURL: firebaseUser.photoURL,
            email: firebaseUser.email || 'guest@classroom.local',
            role: isAdminEmail ? 'admin' : 'student'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setIsSigningIn(true);
    try {
      const { user: anonUser } = await signInAnonymously(auth);
      await updateProfile(anonUser, { displayName: guestName });
      
      const newProfile: UserProfile = {
        uid: anonUser.uid,
        displayName: guestName,
        photoURL: null,
        email: 'guest@classroom.local',
        role: 'student'
      };
      await setDoc(doc(db, 'users', anonUser.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error('Guest login failed:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto md:mx-0 mb-8 border border-emerald-500/20">
              <Gamepad2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 tracking-tight text-center md:text-left">GameBash</h1>
            <p className="text-neutral-400 text-xl mb-10 leading-relaxed">
              Build your own board &amp; card games. Share them. Play them with your class.
            </p>
          </div>

          <div className="space-y-8 bg-neutral-900/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl">
            {/* Teacher Login */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Teacher Access</h2>
              <button
                onClick={handleLogin}
                className="w-full bg-white hover:bg-neutral-200 text-neutral-950 font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-xl"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Sign in with Google
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-4 text-neutral-500 font-bold">OR</span></div>
            </div>

            {/* Student Login */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Student Access</h2>
              <form onSubmit={handleGuestLogin} className="space-y-3">
                <input 
                  type="text"
                  placeholder="Enter your name..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-neutral-800 border border-white/10 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={isSigningIn || !guestName.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
                >
                  {isSigningIn ? 'Joining...' : 'Join as Student'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
              <p className="text-[10px] text-neutral-500 text-center uppercase tracking-widest">No account required</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin' || user.email === 'kmacek715@gmail.com';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col">
      {/* Navigation */}
      {view === 'lobby' && (
        <nav className="border-b border-white/5 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setView('lobby')}
              >
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-neutral-900" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">GameBash</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                <NavButton 
                  active={view === 'lobby'} 
                  onClick={() => setView('lobby')}
                  icon={<Users className="w-4 h-4" />}
                  label="Lobby"
                />
                <NavButton 
                  active={(view as string) === 'editor'} 
                  onClick={() => {
                    setShowTemplatePicker(true);
                  }}
                  icon={<Edit className="w-4 h-4" />}
                  label="Create Game"
                />
                {isAdmin && (
                  <NavButton 
                    active={view === 'classroom' as any} 
                    onClick={() => setView('classroom' as any)}
                    icon={<UserIcon className="w-4 h-4" />}
                    label="Classroom"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">{user.displayName}</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">
                    {isAdmin ? 'Teacher' : 'Student'}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'lobby' && (
          <Lobby 
            profile={profile}
            onEditGame={(id) => {
              setSelectedGameId(id);
              setPendingTemplate(null);
              setView('editor');
            }}
            onJoinRoom={(id) => {
              setSelectedRoomId(id);
              setView('room');
            }}
            onNewGame={() => setShowTemplatePicker(true)}
          />
        )}

        {view === 'editor' && (
          <Editor 
            gameId={selectedGameId} 
            isAdmin={isAdmin}
            initialTemplate={pendingTemplate}
            onClose={() => {
              setPendingTemplate(null);
              setView('lobby');
            }} 
            onSaveSuccess={(id) => {
              setSelectedGameId(id);
              setPendingTemplate(null);
              // Stay in editor but now in "edit" mode
            }}
          />
        )}

        {view === 'room' && selectedRoomId && (
          <GameRoom 
            roomId={selectedRoomId} 
            onLeave={() => setView('lobby')} 
          />
        )}

        {view === 'classroom' && isAdmin && (
          <ClassroomDashboard />
        )}
      </main>
      <Toaster position="bottom-right" theme="dark" richColors />

      {showTemplatePicker && (
        <TemplatePicker
          onPick={(t) => {
            setShowTemplatePicker(false);
            setSelectedGameId(null);
            setPendingTemplate(t);
            setView('editor');
          }}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}

function TemplatePicker({ onPick, onClose }: { onPick: (t: StarterGame) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Pick a starting template</h2>
              <p className="text-sm text-neutral-500">Start from a blank canvas or remix a ready-made game.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_GAMES.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              className="group text-left bg-neutral-800/50 hover:bg-neutral-800 border border-white/5 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-colors"
            >
              <div
                className="aspect-[16/9] relative overflow-hidden"
                style={{
                  backgroundColor: t.config.board.backgroundColor,
                  backgroundImage: t.config.board.backgroundImage ? `url(${t.config.board.backgroundImage})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute top-3 left-3 text-3xl">{t.emoji}</div>
              </div>
              <div className="p-4 space-y-1">
                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">{t.name}</h3>
                <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider">{t.tagline}</p>
                <p className="text-xs text-neutral-400 leading-relaxed mt-2">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
