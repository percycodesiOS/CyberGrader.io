import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  getDoc,
  Timestamp,
  deleteDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { GameRoom as GameRoomType, GameTemplate, Player, Message } from '../types';
import { Board } from './Board';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  MessageSquare, 
  Send, 
  LogOut, 
  Play, 
  Settings,
  User as UserIcon,
  Crown,
  Share2,
  CreditCard,
  RotateCcw,
  X,
  Layers,
  Dices,
  UserMinus,
  DoorOpen,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './Dialog';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GameRoomProps {
  roomId: string;
  onLeave: () => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({ roomId, onLeave }) => {
  const [room, setRoom] = useState<GameRoomType | null>(null);
  const [game, setGame] = useState<GameTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [drawnCard, setDrawnCard] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [copied, setCopied] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'leave' | 'kick' | 'delete' | 'reset';
    playerId?: string;
  } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/messages`));
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), async (snapshot) => {
      if (snapshot.exists()) {
        const roomData = { id: snapshot.id, ...snapshot.data() } as GameRoomType;
        setRoom(roomData);

        // Join room if not already in
        if (auth.currentUser && !roomData.playerUids?.includes(auth.currentUser.uid)) {
          const newPlayer: Player = {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Anonymous',
            photoURL: auth.currentUser.photoURL,
            color: '#10b981',
          };
          await updateDoc(doc(db, 'rooms', roomId), {
            players: arrayUnion(newPlayer),
            playerUids: arrayUnion(auth.currentUser.uid)
          });
        }

        // Fetch game template if not already fetched
        if (!game || game.id !== roomData.gameId) {
          const gameDoc = await getDoc(doc(db, 'games', roomData.gameId));
          if (gameDoc.exists()) {
            setGame({ id: gameDoc.id, ...gameDoc.data() } as GameTemplate);
          }
        }
        setLoading(false);
      } else {
        onLeave();
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`));

    return () => unsubscribe();
  }, [roomId, game, onLeave]);

  const sendSystemMessage = async (text: string) => {
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: 'system',
        senderName: 'System',
        text,
        createdAt: serverTimestamp(),
        type: 'system'
      });
    } catch (error) {
      console.error('Failed to send system message:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !auth.currentUser) return;
    
    const text = message.trim();
    setMessage('');
    
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Anonymous',
        text,
        createdAt: serverTimestamp(),
        type: 'chat'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}/messages`);
    }
  };

  const handlePieceMove = async (pieceId: string, x: number, y: number) => {
    if (!room || !auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`state.pieces.${pieceId}`]: { x, y, lastMovedBy: auth.currentUser.uid }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const startGame = async () => {
    if (!room || !game) return;
    
    // Initialize deck
    const deck: string[] = [];
    game.config.cards.forEach(card => {
      for (let i = 0; i < card.count; i++) {
        deck.push(card.id);
      }
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    await updateDoc(doc(db, 'rooms', roomId), { 
      status: 'playing',
      'state.currentDeck': deck,
      'state.discardPile': []
    });
    await sendSystemMessage('The game has started!');
  };

  const drawCard = async () => {
    if (!room || !auth.currentUser || room.state.currentDeck.length === 0) return;
    
    const newDeck = [...room.state.currentDeck];
    const drawnCardId = newDeck.pop()!;
    const card = game.config.cards.find(c => c.id === drawnCardId);
    
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        'state.currentDeck': newDeck,
        'state.discardPile': arrayUnion(drawnCardId)
      });
      setDrawnCard(drawnCardId);
      await sendSystemMessage(`${auth.currentUser.displayName} drew a card: ${card?.name || 'Unknown'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const resetDeck = async () => {
    if (!room || !game || !isHost) return;
    
    const deck: string[] = [];
    game.config.cards.forEach(card => {
      for (let i = 0; i < card.count; i++) {
        deck.push(card.id);
      }
    });

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    await updateDoc(doc(db, 'rooms', roomId), { 
      'state.currentDeck': deck,
      'state.discardPile': []
    });
  };

  const rollDice = async () => {
    if (!room || !game || !auth.currentUser || !game.config.features.enableDice) return;
    const diceCount = game.config.dice?.count || 1;
    const sides = game.config.dice?.sides || 6;
    const values = Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1);
    
    await updateDoc(doc(db, 'rooms', roomId), {
      'state.diceResult': {
        values,
        rolledBy: auth.currentUser.uid,
        timestamp: Date.now()
      }
    });
    await sendSystemMessage(`${auth.currentUser.displayName} rolled ${values.join(', ')} (Total: ${values.reduce((a, b) => a + b, 0)})`);
  };

  const updateScore = async (uid: string, delta: number) => {
    if (!room || !isHost) return;
    const currentScore = room.state.scores[uid] || 0;
    const newScore = Math.max(0, currentScore + delta);
    
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`state.scores.${uid}`]: newScore
      });
      
      if (delta > 0) {
        // Confetti removed to eliminate falling effect
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const kickPlayer = async (playerId: string) => {
    if (!isHost || playerId === auth.currentUser?.uid || !room) return;
    setConfirmAction({ type: 'kick', playerId });
  };

  const performKickPlayer = async (playerId: string) => {
    if (!room) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        players: room.players.filter(p => p.uid !== playerId),
        playerUids: room.playerUids.filter(uid => uid !== playerId)
      });
      sendSystemMessage(`${room.players.find(p => p.uid === playerId)?.displayName} has been kicked from the room.`);
      toast.success('Player kicked');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setConfirmAction(null);
    }
  };

  const leaveRoom = async () => {
    setConfirmAction({ type: 'leave' });
  };

  const performLeaveRoom = async () => {
    try {
      if (isHost) {
        await deleteDoc(doc(db, 'rooms', roomId));
        onLeave();
      } else {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          players: room?.players.filter(p => p.uid !== auth.currentUser?.uid),
          playerUids: room?.playerUids.filter(uid => uid !== auth.currentUser?.uid)
        });
        onLeave();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setConfirmAction(null);
    }
  };

  const deleteRoom = async () => {
    if (!isHost) return;
    setConfirmAction({ type: 'delete' });
  };

  const performDeleteRoom = async () => {
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      onLeave();
      toast.success('Room deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${roomId}`);
    } finally {
      setConfirmAction(null);
    }
  };

  const resetBoard = async () => {
    if (!isHost || !game) return;
    setConfirmAction({ type: 'reset' });
  };

  const performResetBoard = async () => {
    if (!game) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      // Construct piece state from config
      const initialPiecesState: { [pieceId: string]: { x: number; y: number; lastMovedBy: string } } = {};
      (game.config.pieces || []).forEach(p => {
        initialPiecesState[p.id] = { x: p.x, y: p.y, lastMovedBy: '' };
      });
      
      await updateDoc(roomRef, {
        'state.pieces': initialPiecesState
      });
      sendSystemMessage('The board has been reset.');
      toast.success('Board reset');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    } finally {
      setConfirmAction(null);
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success('Room link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !room || !game) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isHost = auth.currentUser?.uid === room.hostId;

  return (
    <div className="h-full flex flex-col bg-neutral-950 overflow-hidden">
      {/* Room Header */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-neutral-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={onLeave}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">{game.name}</h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
              {room.status === 'lobby' ? 'Waiting for players' : 'Game in progress'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            {room.players.map((p) => (
              <img 
                key={p.uid} 
                src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.uid}`} 
                className="w-8 h-8 rounded-full border-2 border-neutral-900"
                title={p.displayName}
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
          
          {isHost && room.status === 'lobby' && (
            <button 
              onClick={startGame}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Game
            </button>
          )}
          
          <button 
            onClick={() => setShowPlayers(!showPlayers)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showPlayers ? "bg-emerald-500/10 text-emerald-500" : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Room Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Game Board */}
        <div className="flex-1 bg-neutral-950 p-2 md:p-4 lg:p-8 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full relative flex items-center justify-center">
            {game && room && (
              <Board 
                config={game.config} 
                piecesState={room.state.pieces}
                onPieceMove={handlePieceMove}
              />
            )}
          </div>
        </div>

        {/* Players Sidebar */}
        {showPlayers && (
          <div className="w-72 border-l border-white/5 bg-neutral-900/50 backdrop-blur-xl absolute right-0 top-0 bottom-0 z-10">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Players</h3>
                <span className="text-xs text-emerald-500 font-bold">{room.players.length} / 10</span>
              </div>

              <div className="space-y-3">
                {room.players.map(player => (
                  <div key={player.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.uid}`} 
                          className="w-8 h-8 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                        {player.uid === room.hostId && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-neutral-900">
                            <Crown className="w-2.5 h-2.5 text-neutral-900" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-neutral-200">{player.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isHost && player.uid !== auth.currentUser?.uid && (
                        <button 
                          onClick={() => kickPlayer(player.uid)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Kick Player"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Room Actions</h3>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={leaveRoom}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    <DoorOpen className="w-4 h-4" />
                    Leave Room
                  </button>
                  {isHost && (
                    <>
                      <button 
                        onClick={resetBoard}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Board
                      </button>
                      <button 
                        onClick={deleteRoom}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Room
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Room Info</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Room ID</span>
                    <button 
                      onClick={copyRoomId}
                      className="flex items-center gap-1.5 text-neutral-300 font-mono hover:text-emerald-500 transition-colors group"
                    >
                      <span>{roomId.slice(0, 8)}...</span>
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Created</span>
                    <span className="text-neutral-300">{(room.createdAt as Timestamp).toDate().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          {room.status === 'playing' && game?.config?.features?.enableCards && (
            <>
              <div className="flex items-center gap-1 px-2">
                <button 
                  onClick={drawCard}
                  disabled={room.state.currentDeck.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <CreditCard className="w-4 h-4" />
                  Draw ({room.state.currentDeck.length})
                </button>
                <button 
                  onClick={() => setShowDiscard(true)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors relative"
                >
                  <Layers className="w-5 h-5" />
                  {room.state.discardPile.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-neutral-700 text-[10px] flex items-center justify-center rounded-full border border-white/10">
                      {room.state.discardPile.length}
                    </span>
                  )}
                </button>
                {isHost && (
                  <button 
                    onClick={resetDeck}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    title="Reset Deck"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="w-px h-6 bg-white/10 mx-1" />
            </>
          )}

          {room.status === 'playing' && game?.config?.features?.enableDice && (
            <>
              <div className="flex items-center gap-2 px-3">
                <button 
                  onClick={rollDice}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors border border-white/5"
                  title="Roll Dice"
                >
                  <Dices className="w-5 h-5" />
                </button>
                {room.state.diceResult && (
                  <div className="flex gap-1.5">
                    {room.state.diceResult.values.map((v, i) => (
                      <div 
                        key={`${room.state.diceResult?.timestamp}-${i}`}
                        className="w-8 h-8 bg-white text-neutral-900 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg"
                      >
                        {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-px h-6 bg-white/10 mx-1" />
            </>
          )}

          {game?.config?.features?.enableScores && (
            <>
              <ControlButton 
                icon={<Trophy className="w-4 h-4" />} 
                label="Scores" 
                active={showScores}
                onClick={() => {
                  setShowScores(!showScores);
                  setShowChat(false);
                  setShowPlayers(false);
                }}
              />
              <div className="w-px h-6 bg-white/10 mx-1" />
            </>
          )}
          <ControlButton 
            icon={<MessageSquare className="w-4 h-4" />} 
            label="Chat" 
            active={showChat}
            onClick={() => {
              setShowChat(!showChat);
              setShowScores(false);
              setShowPlayers(false);
            }}
          />
          <div className="w-px h-6 bg-white/10 mx-1" />
          <ControlButton icon={<Share2 className="w-4 h-4" />} label="Invite" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Room link copied to clipboard!');
          }} />
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-white/5 bg-neutral-900/80 backdrop-blur-xl absolute right-0 top-0 bottom-0 z-10 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Room Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map(msg => (
                <div key={msg.id} className={cn(
                  "flex flex-col gap-1",
                  msg.type === 'system' ? "items-center" : (msg.senderId === auth.currentUser?.uid ? "items-end" : "items-start")
                )}>
                  {msg.type === 'system' ? (
                    <span className="text-[10px] text-neutral-500 font-medium bg-white/5 px-2 py-1 rounded-full">{msg.text}</span>
                  ) : (
                    <>
                      <span className="text-[10px] text-neutral-500 font-bold px-1">{msg.senderName}</span>
                      <div className={cn(
                        "px-3 py-2 rounded-2xl text-sm max-w-[90%]",
                        msg.senderId === auth.currentUser?.uid ? "bg-emerald-600 text-white rounded-tr-none" : "bg-neutral-800 text-neutral-200 rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t border-white/5 flex gap-2">
              <input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              <button type="submit" className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Scores Sidebar */}
        {showScores && (
          <div className="w-72 border-l border-white/5 bg-neutral-900/80 backdrop-blur-xl absolute right-0 top-0 bottom-0 z-10">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Scoreboard</h3>
                <button onClick={() => setShowScores(false)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                {room.players.map(player => (
                  <div key={player.uid} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.uid}`} className="w-8 h-8 rounded-full" />
                      <span className="text-sm font-medium text-white">{player.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isHost && (
                        <button onClick={() => updateScore(player.uid, -1)} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">-</button>
                      )}
                      <span className="text-lg font-bold text-emerald-500">{room.state.scores[player.uid] || 0}</span>
                      {isHost && (
                        <button onClick={() => updateScore(player.uid, 1)} className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">+</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Drawn Card Modal */}
        {drawnCard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setDrawnCard(null)}
          >
            <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const card = game.config.cards.find(c => c.id === drawnCard);
                if (!card) return null;
                return (
                  <div className="p-8 space-y-6">
                    <div className="aspect-[3/4] bg-neutral-800 rounded-3xl border border-white/5 overflow-hidden relative group">
                      {card.imageUrl ? (
                        <img 
                          src={card.imageUrl} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <CreditCard className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-60" />
                    </div>
                    
                    <div className="space-y-2 text-center">
                      <h3 className="text-2xl font-bold text-white tracking-tight">{card.name}</h3>
                      <p className="text-neutral-400 leading-relaxed">{card.description}</p>
                    </div>

                    <button 
                      onClick={() => setDrawnCard(null)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-50 text-white hover:text-neutral-900 font-bold rounded-2xl transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Discard Pile Modal */}
        {showDiscard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowDiscard(false)}
          >
            <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-tight">Discard Pile</h3>
                <button 
                  onClick={() => setShowDiscard(false)}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 gap-4 custom-scrollbar">
                {room.state.discardPile.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-neutral-500">
                    The discard pile is empty.
                  </div>
                ) : (
                  [...room.state.discardPile].reverse().map((cardId, index) => {
                    const card = game.config.cards.find(c => c.id === cardId);
                    if (!card) return null;
                    return (
                      <div key={`${cardId}-${index}`} className="bg-neutral-800/50 border border-white/5 rounded-2xl p-4 space-y-3">
                        <div className="aspect-[3/4] bg-neutral-900 rounded-xl overflow-hidden">
                          {card.imageUrl ? (
                            <img src={card.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                              <CreditCard className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-white truncate">{card.name}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.type === 'leave' ? 'Leave Room?' :
          confirmAction?.type === 'kick' ? 'Kick Player?' :
          confirmAction?.type === 'delete' ? 'Delete Room?' :
          'Reset Board?'
        }
        description={
          confirmAction?.type === 'leave' ? (isHost ? 'You are the host. Leaving will delete the room for everyone.' : 'Are you sure you want to leave this game room?') :
          confirmAction?.type === 'kick' ? 'Are you sure you want to kick this player from the room?' :
          confirmAction?.type === 'delete' ? 'This will delete the room and disconnect all players.' :
          'This will reset all game pieces to their initial positions.'
        }
        confirmLabel={
          confirmAction?.type === 'leave' ? 'Leave' :
          confirmAction?.type === 'kick' ? 'Kick' :
          confirmAction?.type === 'delete' ? 'Delete' :
          'Reset'
        }
        variant={confirmAction?.type === 'reset' ? 'info' : 'danger'}
        onConfirm={() => {
          if (!confirmAction) return;
          switch (confirmAction.type) {
            case 'leave': performLeaveRoom(); break;
            case 'kick': performKickPlayer(confirmAction.playerId!); break;
            case 'delete': performDeleteRoom(); break;
            case 'reset': performResetBoard(); break;
          }
        }}
      />
    </div>
  );
};
function ControlButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest",
        active ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "text-neutral-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
