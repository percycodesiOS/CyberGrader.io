// Legacy export — kept for the "Make a demo game" button.
// The real starter library lives in src/data/presets.ts → STARTER_GAMES.
import type { GameTemplate } from './types';
import { STARTER_GAMES } from './data/presets';

export const DEFAULT_GAMES: Partial<GameTemplate>[] = STARTER_GAMES.map((s) => ({
  name: s.name,
  description: s.description,
  config: s.config,
}));
