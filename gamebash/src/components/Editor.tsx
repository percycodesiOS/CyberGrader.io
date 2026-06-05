import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db, auth, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, Timestamp } from 'firebase/firestore';
import { GameConfig, GameTemplate, GamePiece, GameCard } from '../types';
import { PIECE_CATEGORIES, BOARD_THEMES, DECK_TEMPLATES, StarterGame } from '../data/presets';
import { Board } from './Board';
import { 
  Save, 
  Trash2, 
  Plus, 
  Settings, 
  ArrowLeft, 
  Layers, 
  Palette, 
  Maximize2,
  Circle as CircleIcon,
  Square as SquareIcon,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Play,
  RotateCcw,
  Trophy,
  X,
  Download,
  Upload,
  HelpCircle,
  Sparkles,
  Dices,
  Send,
  Check,
  AlertTriangle,
  Search,
  Layout
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EditorProps {
  gameId: string | null;
  isAdmin: boolean;
  initialTemplate?: StarterGame | null;
  onClose: () => void;
  onSaveSuccess?: (id: string) => void;
}

type GameStatus = 'draft' | 'pending' | 'approved' | 'rejected';

const DEFAULT_CONFIG: GameConfig = {
  board: {
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    gridSize: 40,
  },
  pieces: [],
  cards: [],
  dice: {
    enabled: true,
    count: 1,
    sides: 6,
    color: '#ffffff',
  },
  features: {
    enableDice: true,
    enableCards: true,
    enableScores: true,
    enableTurns: true,
  },
  assets: [],
};



const ADJECTIVES = ['Epic', 'Mystic', 'Super', 'Crazy', 'Dungeon', 'Space', 'Forest', 'Royal', 'Ancient', 'Cyber', 'Neon', 'Golden', 'Lost', 'Hidden', 'Infinite'];
const NOUNS = ['Quest', 'Battle', 'Race', 'Empire', 'Land', 'World', 'Legends', 'Duel', 'Kingdom', 'Odyssey', 'Circuit', 'Voyage', 'Clash', 'Realm', 'Arena'];

const generateRandomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

export const Editor: React.FC<EditorProps> = ({ gameId, isAdmin, initialTemplate, onClose, onSaveSuccess }) => {
  const [name, setName] = useState(initialTemplate && initialTemplate.id !== 'blank' ? `My ${initialTemplate.name}` : 'My New Game');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [status, setStatus] = useState<GameStatus>('draft');
  const [rejectionReason, setRejectionReason] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<GameConfig>(initialTemplate?.config || DEFAULT_CONFIG);
  const [pieceCategory, setPieceCategory] = useState<string>(PIECE_CATEGORIES[0].id);
  const [pieceSearch, setPieceSearch] = useState('');
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [pendingRejectReason, setPendingRejectReason] = useState('');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'pieces' | 'cards' | 'systems' | 'assets'>('board');
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Playtest State
  const [playtestDiceResult, setPlaytestDiceResult] = useState<{ values: number[], timestamp: number } | null>(null);
  const [playtestDeck, setPlaytestDeck] = useState<string[]>([]);
  const [playtestDiscard, setPlaytestDiscard] = useState<string[]>([]);
  const [playtestDrawnCard, setPlaytestDrawnCard] = useState<string | null>(null);
  const [playtestScores, setPlaytestScores] = useState<{ [uid: string]: number }>({ 'preview-user': 0 });

  useEffect(() => {
    if (showPreview) {
      resetPlaytestDeck();
      setPlaytestScores({ 'preview-user': 0 });
      setPlaytestDiceResult(null);
    }
  }, [showPreview]);

  const rollPlaytestDice = () => {
    const diceCount = config.dice?.count || 1;
    const sides = config.dice?.sides || 6;
    const values = Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1);
    setPlaytestDiceResult({ values, timestamp: Date.now() });
  };

  const drawPlaytestCard = () => {
    if (playtestDeck.length === 0) return;
    const newDeck = [...playtestDeck];
    const cardId = newDeck.pop()!;
    setPlaytestDeck(newDeck);
    setPlaytestDiscard(prev => [...prev, cardId]);
    setPlaytestDrawnCard(cardId);
  };

  const resetPlaytestDeck = () => {
    const deck: string[] = [];
    config.cards.forEach(card => {
      for (let i = 0; i < card.count; i++) deck.push(card.id);
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setPlaytestDeck(deck);
    setPlaytestDiscard([]);
    setPlaytestDrawnCard(null);
  };

  const updatePlaytestScore = (delta: number) => {
    setPlaytestScores(prev => ({
      ...prev,
      'preview-user': Math.max(0, (prev['preview-user'] || 0) + delta)
    }));
  };

  useEffect(() => {
    if (gameId) {
      const fetchGame = async () => {
        try {
          const docRef = doc(db, 'games', gameId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as GameTemplate;
            setName(data.name || 'Untitled Game');
            setDescription(data.description || '');
            // Back-compat: if old `isPublic` exists but `status` does not,
            // map true→approved / false→draft.
            const initialStatus: GameStatus =
              data.status ?? (data.isPublic ? 'approved' : 'draft');
            setStatus(initialStatus);
            setRejectionReason(data.rejectionReason);
            setConfig(data.config || DEFAULT_CONFIG);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `games/${gameId}`);
        }
      };
      fetchGame();
    }
  }, [gameId]);

  // Single save fn that knows about every status transition.
  // toStatus null = just write the current status as-is.
  const handleSave = async (toStatus: GameStatus | null = null) => {
    if (!auth.currentUser) return;
    setSaving(true);

    const nextStatus: GameStatus = toStatus ?? status;
    const becomingApproved = nextStatus === 'approved' && status !== 'approved';
    const becomingRejected = nextStatus === 'rejected' && status !== 'rejected';

    try {
      const gameData: Partial<GameTemplate> = {
        name,
        description,
        config,
        updatedAt: serverTimestamp(),
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || 'Anonymous',
        status: nextStatus,
        // Mirror for back-compat / convenient queries
        isPublic: nextStatus === 'approved',
      };

      if (becomingApproved || becomingRejected) {
        gameData.reviewedBy = auth.currentUser.uid;
        gameData.reviewedAt = serverTimestamp();
      }
      if (nextStatus === 'rejected') {
        gameData.rejectionReason = rejectionReason || pendingRejectReason || 'No reason provided.';
      } else if (nextStatus === 'draft' || nextStatus === 'approved') {
        gameData.rejectionReason = '';
      }

      if (gameId) {
        await updateDoc(doc(db, 'games', gameId), gameData);
        toast.success(
          nextStatus === 'pending' ? 'Submitted for teacher review!' :
          nextStatus === 'approved' ? 'Game approved & published!' :
          nextStatus === 'rejected' ? 'Game rejected.' :
          'Draft saved.'
        );
      } else {
        const newGameRef = doc(collection(db, 'games'));
        await setDoc(newGameRef, {
          ...gameData,
          id: newGameRef.id,
          createdAt: serverTimestamp(),
        });
        toast.success(
          nextStatus === 'approved' ? 'New game published!' :
          nextStatus === 'pending' ? 'Submitted for teacher review!' :
          'Draft saved.'
        );
        if (onSaveSuccess) {
          onSaveSuccess(newGameRef.id);
        }
      }
      setStatus(nextStatus);
      // Only close if it was an update or if we don't have onSaveSuccess
      if (gameId || !onSaveSuccess) {
        onClose();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'games');
      toast.error('Failed to save game.');
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${name.replace(/\s+/g, '_').toLowerCase()}_config.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedConfig = JSON.parse(event.target?.result as string);
        // Basic validation
        if (importedConfig.board) {
          setConfig(importedConfig);
          toast.success('Configuration imported!');
        } else {
          toast.error('Invalid game configuration file.');
        }
      } catch (error) {
        toast.error('Failed to import config. Invalid JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const addPiece = (preset?: { name: string; color: string; shape: string; imageUrl?: string }) => {
    const newPiece: GamePiece = {
      id: uuidv4(),
      name: preset?.name || `Piece ${config.pieces.length + 1}`,
      type: 'token',
      color: preset?.color || '#3b82f6',
      shape: (preset?.shape as any) || 'circle',
      imageUrl: preset?.imageUrl,
      x: config.board.width / 2 - 25,
      y: config.board.height / 2 - 25,
      width: 50,
      height: 50,
    };
    setConfig(prev => ({ ...prev, pieces: [...prev.pieces, newPiece] }));
    setSelectedPieceId(newPiece.id);
    setActiveTab('pieces');
  };

  // Apply a built-in board theme — overwrites board appearance but keeps pieces.
  const applyBoardTheme = (themeId: string) => {
    const theme = BOARD_THEMES.find(t => t.id === themeId);
    if (!theme) return;
    setConfig(prev => ({
      ...prev,
      board: {
        width: theme.width,
        height: theme.height,
        backgroundColor: theme.backgroundColor,
        gridSize: theme.gridSize,
        backgroundImage: theme.backgroundImage,
      },
    }));
    toast.success(`Applied "${theme.name}" board theme`);
  };

  // Apply a built-in deck template — replaces cards if any.
  const applyDeckTemplate = (deckId: string, mode: 'replace' | 'append' = 'replace') => {
    const deck = DECK_TEMPLATES.find(d => d.id === deckId);
    if (!deck) return;
    const newCards: GameCard[] = deck.cards.map(c => ({ ...c, id: uuidv4() }));
    setConfig(prev => ({
      ...prev,
      cards: mode === 'append' ? [...prev.cards, ...newCards] : newCards,
      features: { ...prev.features, enableCards: true },
    }));
    setShowDeckPicker(false);
    toast.success(`Loaded "${deck.name}" (${newCards.length} cards)`);
  };

  const updatePiece = (id: string, updates: Partial<GamePiece>) => {
    setConfig(prev => ({
      ...prev,
      pieces: prev.pieces.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const removePiece = (id: string) => {
    setConfig(prev => ({
      ...prev,
      pieces: prev.pieces.filter(p => p.id !== id)
    }));
    if (selectedPieceId === id) setSelectedPieceId(null);
  };

  const addCard = () => {
    const newCard: GameCard = {
      id: uuidv4(),
      name: `Card ${config.cards.length + 1}`,
      description: 'Card description...',
      count: 1,
    };
    setConfig(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
    setSelectedCardId(newCard.id);
    setActiveTab('cards');
  };

  const updateCard = (id: string, updates: Partial<GameCard>) => {
    setConfig(prev => ({
      ...prev,
      cards: prev.cards.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const removeCard = (id: string) => {
    setConfig(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== id)
    }));
    if (selectedCardId === id) setSelectedCardId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `games/${gameId || 'new'}/${uuidv4()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newAsset = {
        id: uuidv4(),
        name: file.name,
        url,
        type: 'other' as const,
      };

      setConfig(prev => ({
        ...prev,
        assets: [...(prev.assets || []), newAsset]
      }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const selectedPiece = config.pieces.find(p => p.id === selectedPieceId);
  const selectedCard = config.cards.find(c => c.id === selectedCardId);

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Editor Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-neutral-900/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose}
            className="group flex items-center gap-2 p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-2xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 transition-colors" />
            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Lobby</span>
          </button>
          
          <div className="h-8 w-px bg-white/10" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-transparent text-white font-black text-xl focus:outline-none placeholder:text-neutral-700 w-64 italic tracking-tight"
                placeholder="Untitled Game"
              />
              <button 
                onClick={() => setName(generateRandomName())}
                className="p-1.5 text-neutral-600 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors"
                title="Generate Random Name"
              >
                <Dices className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={status} />
              <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                {gameId ? 'Editing existing game' : 'New game creation'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-neutral-800/50 rounded-2xl p-1 border border-white/5">
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2.5 text-neutral-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">Guide</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <label className="flex items-center gap-2 p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">Import</span>
              <input type="file" accept=".json" onChange={importConfig} className="hidden" />
            </label>
            <button 
              onClick={exportConfig}
              className="p-2.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest hidden lg:inline">Export</span>
            </button>
          </div>

          <button 
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors border border-white/10 shadow-xl"
          >
            <Play className="w-4 h-4 fill-current" />
            Playtest
          </button>

          {/* Save buttons — layout depends on role + current status */}
          {isAdmin ? (
            <>
              {status === 'pending' && (
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              )}
              <button
                onClick={() => handleSave('approved')}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors shadow-2xl shadow-emerald-900/40"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving…' : status === 'pending' ? 'Approve & Publish' : 'Save & Publish'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors border border-white/10 shadow-xl"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave('pending')}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-colors shadow-2xl shadow-emerald-900/40"
              >
                <Send className="w-4 h-4" />
                {saving ? 'Saving…' : status === 'rejected' ? 'Resubmit' : 'Submit for Review'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rejection reason banner for students */}
      {!isAdmin && status === 'rejected' && rejectionReason && (
        <div className="px-8 py-3 bg-red-950/40 border-b border-red-900/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Teacher feedback</p>
            <p className="text-sm text-red-200 mt-1">{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 border-r border-white/5 bg-neutral-900 flex flex-col">
          <div className="flex border-b border-white/5">
            <TabButton active={activeTab === 'board'} onClick={() => setActiveTab('board')} icon={<Maximize2 className="w-4 h-4" />} label="Board" />
            <TabButton active={activeTab === 'pieces'} onClick={() => setActiveTab('pieces')} icon={<Layers className="w-4 h-4" />} label="Pieces" />
            <TabButton active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<CreditCard className="w-4 h-4" />} label="Cards" />
            <TabButton active={activeTab === 'systems'} onClick={() => setActiveTab('systems')} icon={<Dices className="w-4 h-4" />} label="Systems" />
            <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<ImageIcon className="w-4 h-4" />} label="Assets" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {activeTab === 'board' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Board Themes</h3>
                  <p className="text-[10px] text-neutral-600 leading-relaxed">Pick a starting look. Sets size, color, and background — you can tweak below.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BOARD_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => applyBoardTheme(theme.id)}
                        className="group relative aspect-[4/3] rounded-xl border border-white/5 hover:border-emerald-500/50 overflow-hidden transition-colors text-left"
                        title={theme.description}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: theme.backgroundColor,
                            backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
                            backgroundSize: theme.id === 'racetrack' || theme.id === 'dungeon' || theme.id === 'track' || theme.id === 'trivia' || theme.id === 'battleship' ? 'cover' : undefined,
                            backgroundPosition: 'center',
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <span className="text-[10px] font-black text-white uppercase tracking-tight block leading-tight">{theme.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">General Info</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Game Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Awesome Game"
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe how to play..."
                        rows={3}
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Board Dimensions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Width (px)</label>
                      <input 
                        type="number" 
                        value={config.board.width}
                        onChange={(e) => setConfig(prev => ({ ...prev, board: { ...prev.board, width: parseInt(e.target.value) || 0 } }))}
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Height (px)</label>
                      <input 
                        type="number" 
                        value={config.board.height}
                        onChange={(e) => setConfig(prev => ({ ...prev, board: { ...prev.board, height: parseInt(e.target.value) || 0 } }))}
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Appearance</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Background Color</label>
                      <div className="flex gap-3">
                        <input 
                          type="color" 
                          value={config.board.backgroundColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, board: { ...prev.board, backgroundColor: e.target.value } }))}
                          className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-xl overflow-hidden shadow-lg"
                        />
                        <input 
                          type="text" 
                          value={config.board.backgroundColor}
                          onChange={(e) => setConfig(prev => ({ ...prev, board: { ...prev.board, backgroundColor: e.target.value } }))}
                          className="flex-1 bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Grid Size (px)</label>
                      <input 
                        type="number" 
                        value={config.board.gridSize}
                        onChange={(e) => setConfig(prev => ({ ...prev, board: { ...prev.board, gridSize: parseInt(e.target.value) || 0 } }))}
                        className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Background Image</label>
                      <div className="grid grid-cols-4 gap-3">
                        <button 
                          onClick={() => setConfig(prev => ({ ...prev, board: { ...prev.board, backgroundImage: undefined } }))}
                          className={cn(
                            "aspect-square rounded-xl border-2 flex items-center justify-center text-[9px] font-black uppercase tracking-tighter transition-colors",
                            !config.board.backgroundImage ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/10" : "border-white/5 bg-neutral-800 text-neutral-600 hover:border-white/10"
                          )}
                        >
                          None
                        </button>
                        {config.assets?.map(asset => (
                          <button 
                            key={asset.id}
                            onClick={() => setConfig(prev => ({ ...prev, board: { ...prev.board, backgroundImage: asset.url } }))}
                            className={cn(
                              "aspect-square rounded-xl border-2 overflow-hidden transition-colors shadow-md",
                              config.board.backgroundImage === asset.url ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-white/5 hover:border-white/10"
                            )}
                          >
                            <img src={asset.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pieces' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Built-in Piece Library</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                    <input
                      value={pieceSearch}
                      onChange={(e) => setPieceSearch(e.target.value)}
                      placeholder="Search pieces…"
                      className="w-full bg-neutral-800 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-colors"
                    />
                  </div>
                  {!pieceSearch && (
                    <div className="flex flex-wrap gap-1.5">
                      {PIECE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setPieceCategory(cat.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border",
                            pieceCategory === cat.id
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                              : "bg-neutral-800/50 border-white/5 text-neutral-500 hover:text-neutral-300 hover:border-white/10"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    {(() => {
                      const all = PIECE_CATEGORIES.flatMap(c => c.pieces);
                      const matches = pieceSearch
                        ? all.filter(p => p.name.toLowerCase().includes(pieceSearch.toLowerCase()))
                        : (PIECE_CATEGORIES.find(c => c.id === pieceCategory)?.pieces || []);
                      if (matches.length === 0) {
                        return (
                          <div className="col-span-4 text-center text-[10px] text-neutral-600 py-6">
                            No pieces match “{pieceSearch}”
                          </div>
                        );
                      }
                      return matches.map(preset => (
                        <button
                          key={preset.name + preset.color}
                          onClick={() => addPiece(preset)}
                          title={preset.name}
                          className="aspect-square bg-neutral-800 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-1 p-1.5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
                            style={{
                              backgroundColor: preset.shape === 'image' ? '#0a0a0a' : preset.color,
                              border: preset.shape !== 'image' ? `1px solid ${preset.color}` : undefined,
                              borderRadius: preset.shape === 'circle' ? '50%' : '0.5rem',
                            }}
                          >
                            {preset.shape === 'image' && preset.imageUrl && (
                              <img src={preset.imageUrl} className="w-full h-full object-contain p-1" alt={preset.name} />
                            )}
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-neutral-500 group-hover:text-emerald-500 truncate w-full text-center leading-tight">{preset.name}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                <button 
                  onClick={() => addPiece()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/10 rounded-xl text-neutral-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Blank Piece</span>
                </button>

                <div className="space-y-2">
                  {config.pieces.map(piece => (
                    <div 
                      key={piece.id}
                      onClick={() => setSelectedPieceId(piece.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-colors cursor-pointer group flex items-center justify-between",
                        selectedPieceId === piece.id 
                          ? "bg-emerald-500/10 border-emerald-500/30" 
                          : "bg-neutral-800/50 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: piece.color + '20', color: piece.color }}
                        >
                          {piece.shape === 'circle' ? <CircleIcon className="w-4 h-4" /> : <SquareIcon className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-medium text-neutral-200">{piece.name}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removePiece(piece.id);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedPiece && (
                  <div 
                    className="pt-6 border-t border-white/5 space-y-6"
                  >
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Piece Settings</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Name</label>
                      <input 
                        value={selectedPiece.name}
                        onChange={(e) => updatePiece(selectedPiece.id, { name: e.target.value })}
                        className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Shape</label>
                      <div className="grid grid-cols-3 gap-2">
                        <ShapeButton 
                          active={selectedPiece.shape === 'circle'} 
                          onClick={() => updatePiece(selectedPiece.id, { shape: 'circle' })}
                          icon={<CircleIcon className="w-4 h-4" />}
                          label="Circle"
                        />
                        <ShapeButton 
                          active={selectedPiece.shape === 'square'} 
                          onClick={() => updatePiece(selectedPiece.id, { shape: 'square' })}
                          icon={<SquareIcon className="w-4 h-4" />}
                          label="Square"
                        />
                        <ShapeButton 
                          active={selectedPiece.shape === 'image'} 
                          onClick={() => updatePiece(selectedPiece.id, { shape: 'image' })}
                          icon={<ImageIcon className="w-4 h-4" />}
                          label="Image"
                        />
                      </div>
                    </div>

                    {selectedPiece.shape === 'image' && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Custom Artwork</label>
                        <div className="grid grid-cols-4 gap-2">
                          {config.assets?.map(asset => (
                            <button 
                              key={asset.id}
                              onClick={() => updatePiece(selectedPiece.id, { imageUrl: asset.url, assetId: asset.id })}
                              className={cn(
                                "aspect-square rounded-lg border overflow-hidden transition-colors",
                                selectedPiece.assetId === asset.id ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-white/5 hover:border-white/10"
                              )}
                            >
                              <img src={asset.url} className="w-full h-full object-cover" />
                            </button>
                          ))}
                          <button 
                            onClick={() => setActiveTab('assets')}
                            className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={selectedPiece.color}
                          onChange={(e) => updatePiece(selectedPiece.id, { color: e.target.value })}
                          className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                        />
                        <input 
                          type="text" 
                          value={selectedPiece.color}
                          onChange={(e) => updatePiece(selectedPiece.id, { color: e.target.value })}
                          className="flex-1 bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Width</label>
                        <input 
                          type="number" 
                          value={selectedPiece.width}
                          onChange={(e) => updatePiece(selectedPiece.id, { width: parseInt(e.target.value) || 0 })}
                          className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Height</label>
                        <input 
                          type="number" 
                          value={selectedPiece.height}
                          onChange={(e) => updatePiece(selectedPiece.id, { height: parseInt(e.target.value) || 0 })}
                          className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'cards' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Deck Templates</h3>
                  <p className="text-[10px] text-neutral-600 leading-relaxed">Drop a ready-made deck in, then customize the cards.</p>
                  <button
                    onClick={() => setShowDeckPicker(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4" />
                    Load Deck Template
                  </button>
                </div>

                <button 
                  onClick={addCard}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/10 rounded-xl text-neutral-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors group"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Blank Card</span>
                </button>

                <div className="space-y-2">
                  {config.cards.map(card => (
                    <div 
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-colors cursor-pointer group flex items-center justify-between",
                        selectedCardId === card.id 
                          ? "bg-emerald-500/10 border-emerald-500/30" 
                          : "bg-neutral-800/50 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-neutral-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-200">{card.name}</span>
                          <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-tighter">x{card.count}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCard(card.id);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Deck Settings</h3>
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400">Global Card Back</label>
                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        onClick={() => setConfig(prev => ({ ...prev, cardBackUrl: undefined }))}
                        className={cn(
                          "aspect-square rounded-lg border flex items-center justify-center text-[10px] font-bold uppercase transition-colors",
                          !config.cardBackUrl ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/5 bg-neutral-800 text-neutral-500 hover:border-white/10"
                        )}
                      >
                        None
                      </button>
                      {config.assets?.map(asset => (
                        <button 
                          key={asset.id}
                          onClick={() => setConfig(prev => ({ ...prev, cardBackUrl: asset.url }))}
                          className={cn(
                            "aspect-square rounded-lg border overflow-hidden transition-colors",
                            config.cardBackUrl === asset.url ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-white/5 hover:border-white/10"
                          )}
                        >
                          <img src={asset.url} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCard && (
                  <div 
                    className="pt-6 border-t border-white/5 space-y-6"
                  >
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Card Settings</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Name</label>
                      <input 
                        value={selectedCard.name}
                        onChange={(e) => updateCard(selectedCard.id, { name: e.target.value })}
                        className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Description</label>
                      <textarea 
                        value={selectedCard.description}
                        onChange={(e) => updateCard(selectedCard.id, { description: e.target.value })}
                        rows={3}
                        className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Card Artwork</label>
                      <div className="grid grid-cols-4 gap-2">
                        <button 
                          onClick={() => updateCard(selectedCard.id, { imageUrl: undefined })}
                          className={cn(
                            "aspect-square rounded-lg border flex items-center justify-center text-[10px] font-bold uppercase transition-colors",
                            !selectedCard.imageUrl ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-white/5 bg-neutral-800 text-neutral-500 hover:border-white/10"
                          )}
                        >
                          None
                        </button>
                        {config.assets?.map(asset => (
                          <button 
                            key={asset.id}
                            onClick={() => updateCard(selectedCard.id, { imageUrl: asset.url })}
                            className={cn(
                              "aspect-square rounded-lg border overflow-hidden transition-colors",
                              selectedCard.imageUrl === asset.url ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-white/5 hover:border-white/10"
                            )}
                          >
                            <img src={asset.url} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button 
                          onClick={() => setActiveTab('assets')}
                          className="aspect-square rounded-lg border border-dashed border-white/10 flex items-center justify-center text-neutral-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Custom Image URL</label>
                      <input 
                        value={selectedCard.imageUrl || ''}
                        onChange={(e) => updateCard(selectedCard.id, { imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-neutral-400">Count in Deck</label>
                      <input 
                        type="number" 
                        min="1"
                        value={selectedCard.count}
                        onChange={(e) => updateCard(selectedCard.id, { count: parseInt(e.target.value) || 1 })}
                        className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'systems' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Gameplay Features</h3>
                  <div className="space-y-3">
                    <FeatureToggle 
                      label="Dice System" 
                      enabled={config.features.enableDice} 
                      onChange={(val) => setConfig(prev => ({ ...prev, features: { ...prev.features, enableDice: val } }))} 
                    />
                    <FeatureToggle 
                      label="Card System" 
                      enabled={config.features.enableCards} 
                      onChange={(val) => setConfig(prev => ({ ...prev, features: { ...prev.features, enableCards: val } }))} 
                    />
                    <FeatureToggle 
                      label="Score Tracking" 
                      enabled={config.features.enableScores} 
                      onChange={(val) => setConfig(prev => ({ ...prev, features: { ...prev.features, enableScores: val } }))} 
                    />
                    <FeatureToggle 
                      label="Turn System" 
                      enabled={config.features.enableTurns} 
                      onChange={(val) => setConfig(prev => ({ ...prev, features: { ...prev.features, enableTurns: val } }))} 
                    />
                  </div>
                </div>

                {config.features.enableDice && (
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Dice Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Number of Dice</label>
                        <input 
                          type="number" 
                          min="1"
                          max="5"
                          value={config.dice?.count || 1}
                          onChange={(e) => setConfig(prev => ({ ...prev, dice: { ...(prev.dice || { enabled: true, sides: 6 }), count: parseInt(e.target.value) || 1 } }))}
                          className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Sides per Die</label>
                        <select 
                          value={config.dice?.sides || 6}
                          onChange={(e) => setConfig(prev => ({ ...prev, dice: { ...(prev.dice || { enabled: true, count: 1 }), sides: parseInt(e.target.value) || 6 } }))}
                          className="w-full bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        >
                          {[4, 6, 8, 10, 12, 20].map(s => <option key={s} value={s}>{s} Sides</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-400">Dice Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={config.dice?.color || '#ffffff'}
                            onChange={(e) => setConfig(prev => ({ ...prev, dice: { ...(prev.dice || { enabled: true, count: 1, sides: 6 }), color: e.target.value } }))}
                            className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                          />
                          <input 
                            type="text" 
                            value={config.dice?.color || '#ffffff'}
                            onChange={(e) => setConfig(prev => ({ ...prev, dice: { ...(prev.dice || { enabled: true, count: 1, sides: 6 }), color: e.target.value } }))}
                            className="flex-1 bg-neutral-800 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500/50 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Game Assets</h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-3 border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-emerald-500 transition-colors group"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {config.assets?.map(asset => (
                    <div key={asset.id} className="group relative aspect-square bg-neutral-800 rounded-lg overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-colors">
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setConfig(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== asset.id) }))}
                          className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-neutral-950 p-2 md:p-4 flex items-center justify-center overflow-hidden relative">
          <div className="w-full h-full relative flex items-center justify-center">
            <Board 
              config={showGrid ? config : { ...config, board: { ...config.board, gridSize: 0 } }} 
              isEditable={true}
              onPieceMove={(id, x, y) => updatePiece(id, { x, y })}
              onPieceSelect={setSelectedPieceId}
              selectedPieceId={selectedPieceId}
            />
            
            {/* Piece/Card Quick Preview Overlay */}
            {(selectedPiece || selectedCard) && (
              <div className="absolute top-4 right-4 p-4 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-10 w-48 pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  {selectedPiece ? (
                    <>
                      <div 
                        className="w-16 h-16 rounded-lg border border-white/10"
                        style={{ 
                          backgroundColor: selectedPiece.shape === 'image' ? 'transparent' : selectedPiece.color,
                          backgroundImage: selectedPiece.shape === 'image' ? `url(${selectedPiece.imageUrl})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: selectedPiece.shape === 'circle' ? '50%' : '8px'
                        }}
                      />
                      <span className="text-[10px] font-bold text-white uppercase truncate w-full text-center">{selectedPiece.name}</span>
                    </>
                  ) : selectedCard ? (
                    <>
                      <div className="w-16 h-24 bg-neutral-800 rounded-lg border border-white/10 overflow-hidden">
                        {selectedCard.imageUrl && <img src={selectedCard.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase truncate w-full text-center">{selectedCard.name}</span>
                    </>
                  ) : null}
                </div>
              </div>
            )}
            
            {/* Canvas Overlay Info */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <button 
                onClick={() => setShowGrid(!showGrid)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors border shadow-2xl backdrop-blur-xl",
                  showGrid ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" : "bg-neutral-900/80 border-white/10 text-neutral-500 hover:text-white"
                )}
              >
                Grid: {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="absolute bottom-4 right-4 px-4 py-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl text-[10px] font-black text-neutral-500 flex gap-6 uppercase tracking-[0.2em] shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>{config.board.width}x{config.board.height}px</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>{config.pieces.length} Pieces</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                <span>{config.cards.length} Cards</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deck Template Picker */}
      {showDeckPicker && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div onClick={() => setShowDeckPicker(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Deck Templates</h2>
                <p className="text-sm text-neutral-500">Pick a starter deck. You can edit every card after.</p>
              </div>
              <button onClick={() => setShowDeckPicker(false)} className="p-2 text-neutral-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {DECK_TEMPLATES.map(deck => (
                <div key={deck.id} className="p-5 bg-neutral-800/50 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-base font-bold text-white">{deck.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{deck.description}</p>
                  <p className="text-[10px] text-neutral-600 mt-2 uppercase font-bold tracking-wider">{deck.cards.reduce((s, c) => s + c.count, 0)} cards • {deck.cards.length} types</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => applyDeckTemplate(deck.id, 'replace')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                    >
                      {config.cards.length > 0 ? 'Replace Deck' : 'Use This'}
                    </button>
                    {config.cards.length > 0 && (
                      <button
                        onClick={() => applyDeckTemplate(deck.id, 'append')}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors border border-white/10"
                      >
                        Add to Deck
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog (admin) */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div onClick={() => setShowRejectDialog(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reject this submission?</h2>
                  <p className="text-xs text-neutral-500">The student will see your feedback and can revise.</p>
                </div>
              </div>
              <textarea
                value={pendingRejectReason}
                onChange={(e) => setPendingRejectReason(e.target.value)}
                placeholder="Give a short reason (e.g. 'Add more cards before resubmitting')…"
                rows={4}
                className="w-full bg-neutral-800 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-red-500/50 outline-none transition-colors resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setRejectionReason(pendingRejectReason || 'No reason provided.');
                    setShowRejectDialog(false);
                    await handleSave('rejected');
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            onClick={() => setShowHelp(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Game Design Guide</h2>
                    <p className="text-neutral-400 text-sm">Build your dream game in 4 easy steps</p>
                  </div>
                </div>
                <button onClick={() => setShowHelp(false)} className="p-2 text-neutral-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <HelpStep 
                  number="01" 
                  title="Setup the Board" 
                  desc="Pick a theme or upload your own map. Adjust the grid size to help pieces snap into place." 
                />
                <HelpStep 
                  number="02" 
                  title="Add Pieces" 
                  desc="Use 'Quick Assets' for standard meeples, or upload your own character art." 
                />
                <HelpStep 
                  number="03" 
                  title="Create Cards" 
                  desc="Design a deck of cards with special abilities or events for your players." 
                />
                <HelpStep 
                  number="04" 
                  title="Enable Features" 
                  desc="Toggle Dice, Scores, and Turns to match your game's rules." 
                />
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
                <h4 className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-wider">Pro Tip</h4>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  Once you're done, click <b>Save</b> and then <b>Create Room</b> in the lobby. 
                  Share the <b>Room ID</b> with your students to start playing together in real-time!
                </p>
              </div>

              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-colors"
              >
                Got it, let's build!
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-12 bg-black/90 backdrop-blur-xl">
          <div className="w-full h-full max-w-7xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Game Playtest</h2>
                <p className="text-neutral-500 text-sm">Interactive sandbox to test your game systems</p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-900 rounded-[2.5rem] border border-white/10 overflow-hidden relative shadow-2xl">
              <Board 
                config={config} 
                isEditable={true}
                onPieceMove={(id, x, y) => updatePiece(id, { x, y })}
              />
              
              {/* Playtest Controls Overlay */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1 bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                {config.features.enableDice && (
                  <div className="flex items-center gap-2 px-3">
                    <button 
                      onClick={rollPlaytestDice}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors border border-white/5"
                      title="Roll Dice"
                    >
                      <Dices className="w-5 h-5" />
                    </button>
                    {playtestDiceResult && (
                      <div className="flex gap-1.5">
                        {playtestDiceResult.values.map((v, i) => (
                          <div 
                            key={`${playtestDiceResult.timestamp}-${i}`}
                            className="w-8 h-8 bg-white text-neutral-900 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg"
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="w-px h-6 bg-white/10 mx-1" />
                  </div>
                )}

                {config.features.enableCards && (
                  <div className="flex items-center gap-2 px-2">
                    <button 
                      onClick={drawPlaytestCard}
                      disabled={playtestDeck.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      <CreditCard className="w-4 h-4" />
                      Draw ({playtestDeck.length})
                    </button>
                    <button 
                      onClick={resetPlaytestDeck}
                      className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      title="Reset Deck"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                  </div>
                )}

                {config.features.enableScores && (
                  <div className="flex items-center gap-3 px-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-lg font-bold text-white">{playtestScores['preview-user']}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updatePlaytestScore(-1)} className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-colors">-</button>
                      <button onClick={() => updatePlaytestScore(1)} className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 rounded-lg transition-colors">+</button>
                    </div>
                  </div>
                )}

                <div className="px-4 py-2 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                  Sandbox Mode
                </div>
              </div>

              {/* Drawn Card Overlay */}
              {playtestDrawnCard && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-neutral-900 border border-white/10 rounded-[2rem] p-6 shadow-2xl z-50">
                  {(() => {
                    const card = config.cards.find(c => c.id === playtestDrawnCard);
                    if (!card) return null;
                    return (
                      <div className="space-y-4">
                        <div className="aspect-[3/4] bg-neutral-800 rounded-2xl overflow-hidden">
                          {card.imageUrl ? (
                            <img src={card.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700">
                              <CreditCard className="w-12 h-12" />
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          <h4 className="text-lg font-bold text-white">{card.name}</h4>
                          <p className="text-xs text-neutral-400 mt-1">{card.description}</p>
                        </div>
                        <button 
                          onClick={() => setPlaytestDrawnCard(null)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatusBadge({ status }: { status: GameStatus }) {
  const styles: Record<GameStatus, { bg: string; text: string; dot: string; label: string }> = {
    draft:    { bg: 'bg-neutral-500/10 border-neutral-500/30', text: 'text-neutral-300', dot: 'bg-neutral-400', label: 'Draft' },
    pending:  { bg: 'bg-amber-500/10 border-amber-500/30',     text: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse', label: 'Awaiting Review' },
    approved: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Published' },
    rejected: { bg: 'bg-red-500/10 border-red-500/30',         text: 'text-red-400',     dot: 'bg-red-500',     label: 'Needs Revision' },
  };
  const s = styles[status];
  return (
    <div className={cn('flex items-center gap-2 px-2 py-0.5 rounded-full border', s.bg, s.text)}>
      <div className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{s.label}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-b-2",
        active 
          ? "text-emerald-500 border-emerald-500 bg-emerald-500/5" 
          : "text-neutral-500 border-transparent hover:text-neutral-300 hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ShapeButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border",
        active 
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
          : "bg-neutral-800 border-white/5 text-neutral-400 hover:text-neutral-200 hover:border-white/10"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FeatureToggle({ label, enabled, onChange }: { label: string, enabled: boolean, onChange: (val: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!enabled)}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-xl border transition-colors",
        enabled 
          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
          : "bg-neutral-800 border-white/5 text-neutral-400 hover:border-white/10"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <div className={cn(
        "w-10 h-5 rounded-full relative transition-colors",
        enabled ? "bg-emerald-500" : "bg-neutral-700"
      )}>
        <div className={cn(
          "absolute top-1 w-3 h-3 bg-white rounded-full transition-colors",
          enabled ? "left-6" : "left-1"
        )} />
      </div>
    </button>
  );
}

function HelpStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-black text-white/10 font-mono">{number}</span>
        <h4 className="text-white font-bold text-sm uppercase tracking-wider">{title}</h4>
      </div>
      <p className="text-neutral-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}
