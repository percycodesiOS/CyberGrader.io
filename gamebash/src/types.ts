import { Timestamp, FieldValue } from 'firebase/firestore';

export interface GameConfig {
  board: {
    width: number;
    height: number;
    backgroundColor: string;
    gridSize: number;
    backgroundImage?: string;
  };
  pieces: GamePiece[];
  cards: GameCard[];
  cardBackUrl?: string;
  dice?: {
    enabled: boolean;
    count: number;
    sides: number;
    color?: string;
  };
  features: {
    enableDice: boolean;
    enableCards: boolean;
    enableScores: boolean;
    enableTurns: boolean;
  };
  assets: {
    id: string;
    name: string;
    url: string;
    type: 'piece' | 'board' | 'card' | 'other';
  }[];
}

export interface GamePiece {
  id: string;
  name: string;
  type: 'pawn' | 'token' | 'custom';
  color: string;
  shape: 'circle' | 'square' | 'image';
  imageUrl?: string;
  assetId?: string; // Reference to an asset in the assets array
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameCard {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  count: number;
}

export interface GameTemplate {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  config: GameConfig;
  // Approval workflow:
  //  - 'draft'    = student is still editing (private)
  //  - 'pending'  = student submitted, waiting for teacher review
  //  - 'approved' = teacher approved → visible to everyone
  //  - 'rejected' = teacher rejected, student can revise
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;       // uid of admin who reviewed
  reviewedAt?: Timestamp | FieldValue;
  // Legacy mirror of `status === 'approved'` — kept so any old
  // query patterns still work. Always computed, never the source of truth.
  isPublic: boolean;
}

export interface Player {
  uid: string;
  displayName: string;
  photoURL: string | null;
  color: string;
}

export interface GameRoom {
  id: string;
  gameId: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: Player[];
  playerUids: string[];
  state: {
    pieces: { [pieceId: string]: { x: number; y: number; lastMovedBy: string } };
    scores: { [uid: string]: number };
    turn: string; // uid
    currentDeck: string[]; // card ids
    discardPile: string[];
    diceResult?: {
      values: number[];
      rolledBy: string;
      timestamp: number;
    };
  };
  createdAt: Timestamp | FieldValue;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp | FieldValue;
  type: 'chat' | 'system';
}
