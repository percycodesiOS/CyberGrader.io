import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  Timestamp, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { GameTemplate, GameRoom, Player, UserProfile } from '../types';
import { STARTER_GAMES } from '../data/presets';
import { 
  Plus, 
  Play, 
  Edit, 
  Trash2,
  Copy,
  Users, 
  Gamepad2, 
  Clock, 
  Search, 
  Filter,
  ChevronRight,
  User as UserIcon,
  LayoutGrid,
  Sparkles,
  Dices,
  Inbox,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { toast } from 'sonner';
import { ConfirmDialog } from './Dialog';

import { DEFAULT_GAMES } from '../seedData';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LobbyProps {
  profile: UserProfile | null;
  onEditGame: (id: string) => void;
  onJoinRoom: (id: string) => void;
  onNewGame: () => void;
}

type LobbyTab = 'games' | 'rooms' | 'pending' | 'mine';

export const Lobby: React.FC<LobbyProps> = ({ profile, onEditGame, onJoinRoom, onNewGame }) => {
  const [games, setGames] = useState<GameTemplate[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LobbyTab>('games');
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    // Teacher/Admin can see everything, students see approved games + their own
    const isTeacher = profile?.role === 'admin' || profile?.role === 'teacher' || auth.currentUser?.email === 'kmacek715@gmail.com';
    
    const gamesQuery = collection(db, 'games');
    const unsubscribeGames = onSnapshot(gamesQuery, (snapshot) => {
      const allGames = snapshot.docs.map(doc => {
        const data = doc.data() as GameTemplate;
        // Back-compat: derive status from legacy isPublic if status is missing
        if (!data.status) {
          data.status = data.isPublic ? 'approved' : 'draft';
        }
        return { ...data, id: doc.id };
      });

      // Sort in memory to ensure all games are included even if updatedAt is missing
      allGames.sort((a, b) => {
        const timeA = (a.updatedAt as Timestamp)?.toMillis?.() || 0;
        const timeB = (b.updatedAt as Timestamp)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      if (isTeacher) {
        setGames(allGames);
      } else {
        setGames(allGames.filter(g => g.status === 'approved' || g.creatorId === auth.currentUser?.uid));
      }
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'games'));

    const roomsQuery = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      setRooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameRoom)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'rooms'));

    return () => {
      unsubscribeGames();
      unsubscribeRooms();
    };
  }, [profile, auth.currentUser]);

  const createRoom = async (game: GameTemplate) => {
    if (!auth.currentUser || !game.config) return;
    try {
      const player: Player = {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Anonymous',
        photoURL: auth.currentUser.photoURL,
        color: '#10b981',
      };

      const initialPiecesState: { [pieceId: string]: { x: number; y: number; lastMovedBy: string } } = {};
      (game.config.pieces || []).forEach(p => {
        initialPiecesState[p.id] = { x: p.x, y: p.y, lastMovedBy: '' };
      });

      const newRoomRef = doc(collection(db, 'rooms'));
      const roomData: GameRoom = {
        id: newRoomRef.id,
        gameId: game.id,
        hostId: auth.currentUser.uid,
        status: 'lobby',
        players: [player],
        playerUids: [auth.currentUser.uid],
        state: {
          pieces: initialPiecesState,
          scores: { [auth.currentUser.uid]: 0 },
          turn: auth.currentUser.uid,
          currentDeck: [],
          discardPile: [],
        },
        createdAt: serverTimestamp(),
      };

      await setDoc(newRoomRef, roomData);
      onJoinRoom(newRoomRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rooms');
    }
  };

  const deleteGame = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const performDeleteGame = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'games', id));
      toast.success('Game template deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `games/${id}`);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const duplicateGame = async (game: GameTemplate) => {
    try {
      const newGame = {
        ...game,
        name: `${game.name} (Copy)`,
        creatorId: auth.currentUser?.uid,
        creatorName: auth.currentUser?.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      delete (newGame as any).id;
      await addDoc(collection(db, 'games'), newGame);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'games');
    }
  };

  const seedInitialGames = async () => {
    if (!auth.currentUser || seeding) return;
    setSeeding(true);
    try {
      const promises = STARTER_GAMES.map(starter => {
        const newGame = {
          name: starter.name,
          description: starter.description,
          config: starter.config,
          creatorId: auth.currentUser?.uid,
          creatorName: auth.currentUser?.displayName || 'Teacher',
          status: 'approved' as const,
          isPublic: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        return addDoc(collection(db, 'games'), newGame);
      });
      await Promise.all(promises);
      toast.success('Demo games seeded!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'games');
    } finally {
      setSeeding(false);
    }
  };

  const isTeacher = profile?.role === 'admin' || profile?.role === 'teacher';
  const myUid = auth.currentUser?.uid;
  const pendingGames = games.filter(g => g.status === 'pending');
  const myGames = games.filter(g => g.creatorId === myUid);

  // What appears under the current tab.
  const visibleGames = (() => {
    let list: GameTemplate[];
    if (activeTab === 'pending') list = pendingGames;
    else if (activeTab === 'mine') list = myGames;
    else list = isTeacher ? games : games.filter(g => g.status === 'approved' || g.creatorId === myUid);
    return list.filter(g =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.creatorName.toLowerCase().includes(search.toLowerCase())
    );
  })();

  const copyAppUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedAppUrl(true);
    setTimeout(() => setCopiedAppUrl(false), 2000);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto px-6 pt-4 pb-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase">
              Game <span className="text-emerald-500">Lobby</span>
            </h1>
            <button 
              onClick={copyAppUrl}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-colors border shadow-lg",
                copiedAppUrl 
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-emerald-500/10" 
                  : "bg-white/5 border-white/10 text-neutral-500 hover:text-white hover:border-white/20 hover:bg-white/10"
              )}
            >
              {copiedAppUrl ? 'URL Copied!' : 'Share App'}
            </button>
          </div>
          <p className="text-neutral-400 text-lg font-medium">Browse game templates or join an active session.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
              className="bg-neutral-900 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none w-64 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 py-4 border-y border-white/5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-neutral-900 border border-white/5 rounded-xl p-1">
            <TabBtn active={activeTab === 'games'} onClick={() => setActiveTab('games')} icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Games" />
            <TabBtn active={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')} icon={<Users className="w-3.5 h-3.5" />} label="Active Rooms" />
            <TabBtn active={activeTab === 'mine'} onClick={() => setActiveTab('mine')} icon={<UserIcon className="w-3.5 h-3.5" />} label={`Mine (${myGames.length})`} />
            {isTeacher && (
              <TabBtn
                active={activeTab === 'pending'}
                onClick={() => setActiveTab('pending')}
                icon={<Inbox className="w-3.5 h-3.5" />}
                label={`To Review${pendingGames.length ? ` (${pendingGames.length})` : ''}`}
                accent={pendingGames.length > 0 ? 'amber' : 'emerald'}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isTeacher && (
            <button 
              onClick={seedInitialGames}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <Sparkles className="w-4 h-4" />
              Seed Demo Games
            </button>
          )}
          <button 
            onClick={onNewGame}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            New Game
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'rooms' ? (
              <div 
                key="rooms-list"
                className="space-y-4"
              >
                {rooms.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    gameName={games.find(g => g.id === room.gameId)?.name || 'Unknown Game'}
                    onJoin={() => onJoinRoom(room.id)}
                  />
                ))}
                {rooms.length === 0 && (
                  <div className="h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-neutral-500 gap-4">
                    <Users className="w-12 h-12 opacity-20" />
                    <p className="text-lg">No active game rooms.</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                key={`grid-${activeTab}`}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {visibleGames.map((game) => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onPlay={() => createRoom(game)}
                    onEdit={() => onEditGame(game.id)}
                    onDelete={() => deleteGame(game.id)}
                    onDuplicate={() => duplicateGame(game)}
                    isOwner={game.creatorId === myUid}
                    isTeacher={isTeacher}
                  />
                ))}
                {visibleGames.length === 0 && (
                  <EmptyState activeTab={activeTab} search={search} isTeacher={isTeacher} onSeed={seedInitialGames} onNewGame={onNewGame} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Game Template?"
        description="This will permanently delete this game template. You cannot undo this action."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteConfirmId && performDeleteGame(deleteConfirmId)}
      />
    </div>
  );
};

function GameCard({ game, onPlay, onEdit, onDelete, onDuplicate, isOwner, isTeacher }: { game: GameTemplate, onPlay: () => void, onEdit: () => void, onDelete: () => void, onDuplicate: () => void, isOwner: boolean, isTeacher: boolean }) {
  return (
    <div 
      className="bg-neutral-900/50 border border-white/5 rounded-3xl overflow-hidden group hover:border-emerald-500/30 transition-colors shadow-xl shadow-black/20"
    >
      <div className="aspect-[16/9] bg-neutral-800 relative overflow-hidden">
        {game.config?.board?.backgroundImage ? (
          <img 
            src={game.config.board.backgroundImage} 
            alt={game.name}
            className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div 
            className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
            style={{ backgroundColor: game.config?.board?.backgroundColor || '#171717' }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-12 h-12 text-white/10 transition-opacity duration-500" />
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          <GameStatusBadge status={game.status} />
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
          <button 
            onClick={onDuplicate}
            className="p-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white transition-colors"
            title="Duplicate Game"
          >
            <Copy className="w-4 h-4" />
          </button>
          {(isOwner || isTeacher) && (
            <>
              <button 
                onClick={onEdit}
                className="p-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-white transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={onDelete}
                className="p-2 bg-red-500/10 hover:bg-red-500 backdrop-blur-md border border-red-500/20 rounded-xl text-red-500 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-2xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors tracking-tight uppercase italic">
            {game.name}
          </h3>
          <div className="flex items-center gap-3 text-neutral-500 text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              <span>{game.creatorName}</span>
            </div>
            <span className="opacity-30">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>{(game.updatedAt as Timestamp).toDate().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <p className="text-neutral-400 text-sm leading-relaxed line-clamp-2 min-h-[2.5rem] font-medium">
          {game.description || 'No description provided for this game.'}
        </p>

        <button 
          onClick={onPlay}
          disabled={game.status !== 'approved' && !isOwner && !isTeacher}
          className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600/10 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:hover:bg-neutral-800 disabled:text-neutral-600 text-emerald-500 hover:text-white border border-emerald-500/20 disabled:border-white/5 rounded-2xl font-black uppercase tracking-widest transition-colors group/btn shadow-lg hover:shadow-emerald-500/20"
        >
          <Play className="w-4 h-4 fill-current" />
          {game.status === 'approved' || isOwner || isTeacher ? 'Start Session' :
           game.status === 'pending' ? 'Awaiting Approval' : 'Not Yet Approved'}
        </button>
      </div>
    </div>
  );
}

function RoomCard({ room, gameName, onJoin }: { room: GameRoom, gameName: string, onJoin: () => void }) {
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:border-emerald-500/30 transition-colors group">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <Users className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{gameName}'s Session</h3>
          <div className="flex items-center gap-4 text-neutral-500 text-sm mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {room.status === 'lobby' ? 'Waiting for players' : 'Game in progress'}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {room.players.length} / 10 Players
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {room.players.map((p, i) => (
            <img 
              key={p.uid} 
              src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
              className="w-8 h-8 rounded-full border-2 border-neutral-900"
              title={p.displayName}
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
        <button 
          onClick={onJoin}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-900/20"
        >
          Join Room
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, accent = 'emerald' }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; accent?: 'emerald' | 'amber' }) {
  const activeBg = accent === 'amber'
    ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
    : 'bg-emerald-500 text-neutral-900 shadow-lg shadow-emerald-500/20';
  const idle = accent === 'amber' && !active
    ? 'text-amber-400 hover:text-amber-300'
    : 'text-neutral-500 hover:text-neutral-300';
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2',
        active ? activeBg : idle
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function GameStatusBadge({ status }: { status: GameTemplate['status'] }) {
  const styles: Record<GameTemplate['status'], { cls: string; label: string; icon: React.ReactNode }> = {
    draft:    { cls: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30', label: 'Draft', icon: <Edit className="w-3 h-3" /> },
    pending:  { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',       label: 'Awaiting Review', icon: <Clock className="w-3 h-3" /> },
    approved: { cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Published', icon: <CheckCircle2 className="w-3 h-3" /> },
    rejected: { cls: 'bg-red-500/20 text-red-400 border-red-500/30',             label: 'Needs Revision', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = styles[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider', s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}

function EmptyState({ activeTab, search, isTeacher, onSeed, onNewGame }: { activeTab: LobbyTab; search: string; isTeacher: boolean; onSeed: () => void; onNewGame: () => void }) {
  if (activeTab === 'pending') {
    return (
      <div className="col-span-full h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-neutral-500 gap-3 p-8">
        <Inbox className="w-12 h-12 opacity-30 text-emerald-500" />
        <p className="text-lg text-neutral-300 font-bold">Your inbox is clear</p>
        <p className="text-sm text-neutral-500">No student submissions waiting for review.</p>
      </div>
    );
  }
  if (activeTab === 'mine') {
    return (
      <div className="col-span-full h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-neutral-500 gap-3 p-8">
        <Gamepad2 className="w-12 h-12 opacity-30" />
        <p className="text-lg text-neutral-300 font-bold">No games yet</p>
        <p className="text-sm text-neutral-500">Click "New Game" to design your first one.</p>
        <button
          onClick={onNewGame}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create One
        </button>
      </div>
    );
  }
  return (
    <div className="col-span-full h-64 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-neutral-500 gap-4 p-8">
      <Gamepad2 className="w-12 h-12 opacity-20" />
      <p className="text-lg">No games match your search.</p>
      {isTeacher && !search && (
        <button
          onClick={onSeed}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl border border-emerald-500/30 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <Sparkles className="w-4 h-4" />
          Seed Starter Games
        </button>
      )}
    </div>
  );
}
