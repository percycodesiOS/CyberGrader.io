// ============================================================
// GameBash built-in asset library
// ----------------------------------------------------------------
// Big curated collection of pieces, boards, decks, and starter
// games — everything is data, no extra deps. Pieces use Iconify
// (for Lucide icons) + DiceBear (for character avatars), both
// served as URLs so they work the same as student uploads.
// ============================================================

import { GameConfig, GameTemplate, GameCard, GamePiece } from '../types';

// ---------- piece presets ----------

export interface PiecePreset {
  name: string;
  color: string;
  shape: 'circle' | 'square' | 'image';
  imageUrl?: string;
}

export interface PieceCategory {
  id: string;
  label: string;
  description: string;
  pieces: PiecePreset[];
}

// Helper: lucide icon as a colored SVG via Iconify CDN
const lucideIcon = (icon: string, color: string) =>
  `https://api.iconify.design/lucide/${icon}.svg?color=${encodeURIComponent(color)}`;

const dicebear = (style: string, seed: string, bg: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg.replace('#', '')}`;

export const PIECE_CATEGORIES: PieceCategory[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Meeples, pawns, and basic tokens',
    pieces: [
      { name: 'Red Pawn', color: '#ef4444', shape: 'circle' },
      { name: 'Blue Pawn', color: '#3b82f6', shape: 'circle' },
      { name: 'Green Pawn', color: '#22c55e', shape: 'circle' },
      { name: 'Yellow Pawn', color: '#eab308', shape: 'circle' },
      { name: 'Purple Pawn', color: '#a855f7', shape: 'circle' },
      { name: 'Orange Pawn', color: '#f97316', shape: 'circle' },
      { name: 'Pink Pawn', color: '#ec4899', shape: 'circle' },
      { name: 'Black Pawn', color: '#171717', shape: 'circle' },
      { name: 'White Pawn', color: '#ffffff', shape: 'circle' },
      { name: 'Red Square', color: '#ef4444', shape: 'square' },
      { name: 'Blue Square', color: '#3b82f6', shape: 'square' },
      { name: 'Green Square', color: '#22c55e', shape: 'square' },
    ],
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Robots, avatars, fun characters',
    pieces: [
      { name: 'Red Bot',   color: '#ef4444', shape: 'image', imageUrl: dicebear('bottts', 'red',    '#ef4444') },
      { name: 'Blue Bot',  color: '#3b82f6', shape: 'image', imageUrl: dicebear('bottts', 'blue',   '#3b82f6') },
      { name: 'Green Bot', color: '#22c55e', shape: 'image', imageUrl: dicebear('bottts', 'green',  '#22c55e') },
      { name: 'Yellow Bot',color: '#eab308', shape: 'image', imageUrl: dicebear('bottts', 'yellow', '#eab308') },
      { name: 'Purple Bot',color: '#a855f7', shape: 'image', imageUrl: dicebear('bottts', 'purple', '#a855f7') },
      { name: 'Orange Bot',color: '#f97316', shape: 'image', imageUrl: dicebear('bottts', 'orange', '#f97316') },
      { name: 'Hero A',    color: '#0ea5e9', shape: 'image', imageUrl: dicebear('adventurer', 'A', '#0ea5e9') },
      { name: 'Hero B',    color: '#84cc16', shape: 'image', imageUrl: dicebear('adventurer', 'B', '#84cc16') },
      { name: 'Hero C',    color: '#f43f5e', shape: 'image', imageUrl: dicebear('adventurer', 'C', '#f43f5e') },
      { name: 'Pixel Pal', color: '#fbbf24', shape: 'image', imageUrl: dicebear('pixel-art', 'pal', '#fbbf24') },
      { name: 'Pixel Buddy',color: '#10b981',shape: 'image', imageUrl: dicebear('pixel-art', 'buddy', '#10b981') },
      { name: 'Pixel Mate',color: '#8b5cf6', shape: 'image', imageUrl: dicebear('pixel-art', 'mate', '#8b5cf6') },
    ],
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    description: 'Swords, shields, magic, dragons',
    pieces: [
      { name: 'Sword',     color: '#ef4444', shape: 'image', imageUrl: lucideIcon('swords',          '#ef4444') },
      { name: 'Shield',    color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('shield',          '#3b82f6') },
      { name: 'Wand',      color: '#a855f7', shape: 'image', imageUrl: lucideIcon('wand-sparkles',   '#a855f7') },
      { name: 'Crown',     color: '#facc15', shape: 'image', imageUrl: lucideIcon('crown',           '#facc15') },
      { name: 'Gem',       color: '#22d3ee', shape: 'image', imageUrl: lucideIcon('gem',             '#22d3ee') },
      { name: 'Castle',    color: '#737373', shape: 'image', imageUrl: lucideIcon('castle',          '#737373') },
      { name: 'Skull',     color: '#e5e5e5', shape: 'image', imageUrl: lucideIcon('skull',           '#e5e5e5') },
      { name: 'Flame',     color: '#f97316', shape: 'image', imageUrl: lucideIcon('flame',           '#f97316') },
      { name: 'Snowflake', color: '#7dd3fc', shape: 'image', imageUrl: lucideIcon('snowflake',       '#7dd3fc') },
      { name: 'Bow',       color: '#84cc16', shape: 'image', imageUrl: lucideIcon('bow-arrow',       '#84cc16') },
      { name: 'Axe',       color: '#dc2626', shape: 'image', imageUrl: lucideIcon('axe',             '#dc2626') },
      { name: 'Scroll',    color: '#fbbf24', shape: 'image', imageUrl: lucideIcon('scroll-text',     '#fbbf24') },
    ],
  },
  {
    id: 'animals',
    label: 'Animals',
    description: 'Cats, dogs, dragons, birds, fish',
    pieces: [
      { name: 'Cat',     color: '#f97316', shape: 'image', imageUrl: lucideIcon('cat',    '#f97316') },
      { name: 'Dog',     color: '#a16207', shape: 'image', imageUrl: lucideIcon('dog',    '#a16207') },
      { name: 'Bird',    color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('bird',   '#3b82f6') },
      { name: 'Fish',    color: '#06b6d4', shape: 'image', imageUrl: lucideIcon('fish',   '#06b6d4') },
      { name: 'Rabbit',  color: '#e5e5e5', shape: 'image', imageUrl: lucideIcon('rabbit', '#e5e5e5') },
      { name: 'Turtle',  color: '#22c55e', shape: 'image', imageUrl: lucideIcon('turtle', '#22c55e') },
      { name: 'Snail',   color: '#84cc16', shape: 'image', imageUrl: lucideIcon('snail',  '#84cc16') },
      { name: 'Squirrel',color: '#a16207', shape: 'image', imageUrl: lucideIcon('squirrel','#a16207') },
      { name: 'Worm',    color: '#ec4899', shape: 'image', imageUrl: lucideIcon('worm',   '#ec4899') },
      { name: 'Bug',     color: '#dc2626', shape: 'image', imageUrl: lucideIcon('bug',    '#dc2626') },
      { name: 'Cow',     color: '#171717', shape: 'image', imageUrl: lucideIcon('cow',    '#171717') },
      { name: 'Egg',     color: '#fbbf24', shape: 'image', imageUrl: lucideIcon('egg',    '#fbbf24') },
    ],
  },
  {
    id: 'space',
    label: 'Space & Sci-Fi',
    description: 'Rockets, planets, aliens, ships',
    pieces: [
      { name: 'Rocket',   color: '#ef4444', shape: 'image', imageUrl: lucideIcon('rocket',         '#ef4444') },
      { name: 'Star',     color: '#facc15', shape: 'image', imageUrl: lucideIcon('star',           '#facc15') },
      { name: 'Sun',      color: '#fb923c', shape: 'image', imageUrl: lucideIcon('sun',            '#fb923c') },
      { name: 'Moon',     color: '#e5e5e5', shape: 'image', imageUrl: lucideIcon('moon',           '#e5e5e5') },
      { name: 'Satellite',color: '#06b6d4', shape: 'image', imageUrl: lucideIcon('satellite',      '#06b6d4') },
      { name: 'UFO',      color: '#a855f7', shape: 'image', imageUrl: lucideIcon('rocket',         '#a855f7') },
      { name: 'Atom',     color: '#22d3ee', shape: 'image', imageUrl: lucideIcon('atom',           '#22d3ee') },
      { name: 'Radar',    color: '#22c55e', shape: 'image', imageUrl: lucideIcon('radar',          '#22c55e') },
      { name: 'Orbit',    color: '#8b5cf6', shape: 'image', imageUrl: lucideIcon('orbit',          '#8b5cf6') },
      { name: 'Telescope',color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('telescope',      '#3b82f6') },
      { name: 'Globe',    color: '#0ea5e9', shape: 'image', imageUrl: lucideIcon('globe',          '#0ea5e9') },
      { name: 'Sparkle',  color: '#fb7185', shape: 'image', imageUrl: lucideIcon('sparkles',       '#fb7185') },
    ],
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'Balls, trophies, medals',
    pieces: [
      { name: 'Football', color: '#92400e', shape: 'image', imageUrl: lucideIcon('volleyball',  '#92400e') },
      { name: 'Basket',   color: '#f97316', shape: 'image', imageUrl: lucideIcon('volleyball',  '#f97316') },
      { name: 'Trophy',   color: '#facc15', shape: 'image', imageUrl: lucideIcon('trophy',      '#facc15') },
      { name: 'Medal',    color: '#fb923c', shape: 'image', imageUrl: lucideIcon('medal',       '#fb923c') },
      { name: 'Award',    color: '#a855f7', shape: 'image', imageUrl: lucideIcon('award',       '#a855f7') },
      { name: 'Flag',     color: '#ef4444', shape: 'image', imageUrl: lucideIcon('flag',        '#ef4444') },
      { name: 'Whistle',  color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('whistle',     '#3b82f6') },
      { name: 'Stopwatch',color: '#e5e5e5', shape: 'image', imageUrl: lucideIcon('timer',       '#e5e5e5') },
      { name: 'Target',   color: '#dc2626', shape: 'image', imageUrl: lucideIcon('target',      '#dc2626') },
      { name: 'Dumbbell', color: '#737373', shape: 'image', imageUrl: lucideIcon('dumbbell',    '#737373') },
      { name: 'Bike',     color: '#06b6d4', shape: 'image', imageUrl: lucideIcon('bike',        '#06b6d4') },
      { name: 'Shoe',     color: '#a16207', shape: 'image', imageUrl: lucideIcon('footprints',  '#a16207') },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    description: 'Snacks, fruits, treats',
    pieces: [
      { name: 'Apple',     color: '#ef4444', shape: 'image', imageUrl: lucideIcon('apple',     '#ef4444') },
      { name: 'Cherry',    color: '#dc2626', shape: 'image', imageUrl: lucideIcon('cherry',    '#dc2626') },
      { name: 'Cookie',    color: '#a16207', shape: 'image', imageUrl: lucideIcon('cookie',    '#a16207') },
      { name: 'Croissant', color: '#fbbf24', shape: 'image', imageUrl: lucideIcon('croissant', '#fbbf24') },
      { name: 'Donut',     color: '#ec4899', shape: 'image', imageUrl: lucideIcon('donut',     '#ec4899') },
      { name: 'Pizza',     color: '#f97316', shape: 'image', imageUrl: lucideIcon('pizza',     '#f97316') },
      { name: 'Sandwich',  color: '#facc15', shape: 'image', imageUrl: lucideIcon('sandwich',  '#facc15') },
      { name: 'Ice Cream', color: '#fb7185', shape: 'image', imageUrl: lucideIcon('ice-cream-cone','#fb7185') },
      { name: 'Coffee',    color: '#78350f', shape: 'image', imageUrl: lucideIcon('coffee',    '#78350f') },
      { name: 'Cake',      color: '#a855f7', shape: 'image', imageUrl: lucideIcon('cake',      '#a855f7') },
      { name: 'Carrot',    color: '#fb923c', shape: 'image', imageUrl: lucideIcon('carrot',    '#fb923c') },
      { name: 'Lollipop',  color: '#22d3ee', shape: 'image', imageUrl: lucideIcon('lollipop',  '#22d3ee') },
    ],
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    description: 'Cars, planes, trains, ships',
    pieces: [
      { name: 'Car',      color: '#ef4444', shape: 'image', imageUrl: lucideIcon('car',          '#ef4444') },
      { name: 'Race Car', color: '#dc2626', shape: 'image', imageUrl: lucideIcon('car-front',    '#dc2626') },
      { name: 'Truck',    color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('truck',        '#3b82f6') },
      { name: 'Bus',      color: '#facc15', shape: 'image', imageUrl: lucideIcon('bus',          '#facc15') },
      { name: 'Bike',     color: '#22c55e', shape: 'image', imageUrl: lucideIcon('bike',         '#22c55e') },
      { name: 'Plane',    color: '#0ea5e9', shape: 'image', imageUrl: lucideIcon('plane',        '#0ea5e9') },
      { name: 'Ship',     color: '#1e40af', shape: 'image', imageUrl: lucideIcon('ship',         '#1e40af') },
      { name: 'Train',    color: '#737373', shape: 'image', imageUrl: lucideIcon('train-front',  '#737373') },
      { name: 'Tractor',  color: '#a16207', shape: 'image', imageUrl: lucideIcon('tractor',      '#a16207') },
      { name: 'Anchor',   color: '#475569', shape: 'image', imageUrl: lucideIcon('anchor',       '#475569') },
      { name: 'Sailboat', color: '#0891b2', shape: 'image', imageUrl: lucideIcon('sailboat',     '#0891b2') },
      { name: 'Caravan',  color: '#fb923c', shape: 'image', imageUrl: lucideIcon('caravan',      '#fb923c') },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols',
    description: 'Hearts, stars, arrows, math',
    pieces: [
      { name: 'Heart',      color: '#ef4444', shape: 'image', imageUrl: lucideIcon('heart',          '#ef4444') },
      { name: 'Star',       color: '#facc15', shape: 'image', imageUrl: lucideIcon('star',           '#facc15') },
      { name: 'Lightning',  color: '#fbbf24', shape: 'image', imageUrl: lucideIcon('zap',            '#fbbf24') },
      { name: 'Check',      color: '#22c55e', shape: 'image', imageUrl: lucideIcon('check',          '#22c55e') },
      { name: 'Cross',      color: '#dc2626', shape: 'image', imageUrl: lucideIcon('x',              '#dc2626') },
      { name: 'Plus',       color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('plus',           '#3b82f6') },
      { name: 'Minus',      color: '#737373', shape: 'image', imageUrl: lucideIcon('minus',          '#737373') },
      { name: 'Arrow Up',   color: '#22c55e', shape: 'image', imageUrl: lucideIcon('arrow-up',       '#22c55e') },
      { name: 'Arrow Down', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('arrow-down',     '#ef4444') },
      { name: 'Question',   color: '#a855f7', shape: 'image', imageUrl: lucideIcon('help-circle',    '#a855f7') },
      { name: 'Bell',       color: '#fb923c', shape: 'image', imageUrl: lucideIcon('bell',           '#fb923c') },
      { name: 'Key',        color: '#fbbf24', shape: 'image', imageUrl: lucideIcon('key',            '#fbbf24') },
    ],
  },
];

// ---------- board themes ----------

export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  backgroundColor: string;
  gridSize: number;
  backgroundImage?: string;
}

// SVG-as-data-URI pattern generators. Keep them tiny & repeating.
const svgDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const checkerboard = (a: string, b: string, size = 80) => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
  <rect width="${size * 2}" height="${size * 2}" fill="${a}"/>
  <rect x="0" y="0" width="${size}" height="${size}" fill="${b}"/>
  <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${b}"/>
</svg>`);

const dotsPattern = (bg: string, dot: string, size = 40) => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="2" fill="${dot}"/>
</svg>`);

const gridPattern = (bg: string, line: string, size = 40) => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${line}" stroke-width="1"/>
</svg>`);

const hexPattern = (bg: string, line: string) => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="104" viewBox="0 0 60 104">
  <rect width="60" height="104" fill="${bg}"/>
  <path d="M30 2 L58 18 L58 50 L30 66 L2 50 L2 18 Z" fill="none" stroke="${line}" stroke-width="1.5"/>
  <path d="M0 54 L30 70 L60 54 L60 86 L30 102 L0 86 Z" fill="none" stroke="${line}" stroke-width="1.5"/>
</svg>`);

const stripesPattern = (a: string, b: string) => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="80" height="80" fill="${a}"/>
  <rect y="0" width="80" height="40" fill="${b}"/>
</svg>`);

const stoneTilePattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
  <rect width="120" height="120" fill="#2d2a26"/>
  <rect x="2" y="2" width="56" height="56" fill="#3a3631" stroke="#1a1815" stroke-width="2"/>
  <rect x="62" y="2" width="56" height="56" fill="#403c37" stroke="#1a1815" stroke-width="2"/>
  <rect x="2" y="62" width="56" height="56" fill="#403c37" stroke="#1a1815" stroke-width="2"/>
  <rect x="62" y="62" width="56" height="56" fill="#3a3631" stroke="#1a1815" stroke-width="2"/>
</svg>`);

const racetrackPattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#15803d"/>
  <ellipse cx="600" cy="400" rx="540" ry="320" fill="none" stroke="#fafafa" stroke-width="80"/>
  <ellipse cx="600" cy="400" rx="540" ry="320" fill="none" stroke="#1f2937" stroke-width="3" stroke-dasharray="20 20"/>
  <ellipse cx="600" cy="400" rx="380" ry="160" fill="#15803d" stroke="#fafafa" stroke-width="2" stroke-dasharray="10 10"/>
  <rect x="595" y="60" width="10" height="40" fill="#fafafa"/>
  <text x="600" y="40" font-family="Arial" font-size="32" font-weight="bold" fill="#fafafa" text-anchor="middle">START</text>
</svg>`);

const dungeonPattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#1c1917"/>
  <g fill="#292524" stroke="#0c0a09" stroke-width="2">
    <rect x="40" y="40" width="80" height="80"/><rect x="120" y="40" width="80" height="80"/>
    <rect x="200" y="40" width="80" height="80"/><rect x="280" y="40" width="80" height="80"/>
    <rect x="360" y="40" width="80" height="80"/><rect x="440" y="40" width="80" height="80"/>
    <rect x="520" y="40" width="80" height="80"/><rect x="600" y="40" width="80" height="80"/>
    <rect x="680" y="40" width="80" height="80"/>
    <rect x="40" y="120" width="80" height="80"/><rect x="680" y="120" width="80" height="80"/>
    <rect x="40" y="200" width="80" height="80"/><rect x="680" y="200" width="80" height="80"/>
    <rect x="40" y="280" width="80" height="80"/><rect x="680" y="280" width="80" height="80"/>
    <rect x="40" y="360" width="80" height="80"/><rect x="680" y="360" width="80" height="80"/>
    <rect x="40" y="440" width="80" height="80"/><rect x="120" y="440" width="80" height="80"/>
    <rect x="200" y="440" width="80" height="80"/><rect x="280" y="440" width="80" height="80"/>
    <rect x="360" y="440" width="80" height="80"/><rect x="440" y="440" width="80" height="80"/>
    <rect x="520" y="440" width="80" height="80"/><rect x="600" y="440" width="80" height="80"/>
    <rect x="680" y="440" width="80" height="80"/>
  </g>
  <text x="400" y="320" font-family="serif" font-size="48" font-weight="bold" fill="#44403c" text-anchor="middle" opacity="0.5">DUNGEON</text>
</svg>`);

const trackPattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200" viewBox="0 0 1000 200">
  <rect width="1000" height="200" fill="#1f2937"/>
  <g fill="#374151" stroke="#fbbf24" stroke-width="2">
    <rect x="20"  y="60" width="80" height="80"/>
    <rect x="110" y="60" width="80" height="80"/>
    <rect x="200" y="60" width="80" height="80"/>
    <rect x="290" y="60" width="80" height="80"/>
    <rect x="380" y="60" width="80" height="80"/>
    <rect x="470" y="60" width="80" height="80"/>
    <rect x="560" y="60" width="80" height="80"/>
    <rect x="650" y="60" width="80" height="80"/>
    <rect x="740" y="60" width="80" height="80"/>
    <rect x="830" y="60" width="80" height="80" fill="#dc2626"/>
  </g>
  <text x="60"  y="180" font-family="Arial" font-size="14" fill="#fbbf24" text-anchor="middle" font-weight="bold">START</text>
  <text x="870" y="180" font-family="Arial" font-size="14" fill="#dc2626" text-anchor="middle" font-weight="bold">FINISH</text>
</svg>`);

const trivia4QPattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#0f172a"/>
  <rect x="20"  y="20"  width="370" height="270" fill="#1e40af" rx="20"/>
  <rect x="410" y="20"  width="370" height="270" fill="#a21caf" rx="20"/>
  <rect x="20"  y="310" width="370" height="270" fill="#15803d" rx="20"/>
  <rect x="410" y="310" width="370" height="270" fill="#b45309" rx="20"/>
  <text x="205" y="170" font-family="Arial Black" font-size="80" fill="#ffffff" text-anchor="middle" opacity="0.25">A</text>
  <text x="595" y="170" font-family="Arial Black" font-size="80" fill="#ffffff" text-anchor="middle" opacity="0.25">B</text>
  <text x="205" y="460" font-family="Arial Black" font-size="80" fill="#ffffff" text-anchor="middle" opacity="0.25">C</text>
  <text x="595" y="460" font-family="Arial Black" font-size="80" fill="#ffffff" text-anchor="middle" opacity="0.25">D</text>
</svg>`);

const battleshipPattern = () => svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#0c4a6e"/>
  <g stroke="#7dd3fc" stroke-width="1" opacity="0.5">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${40 + i * 72}" y1="40" x2="${40 + i * 72}" y2="560"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<line x1="40" y1="${40 + i * 72}" x2="760" y2="${40 + i * 72}"/>`).join('')}
  </g>
</svg>`);

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'blank-light',
    name: 'Blank (Light)',
    description: 'Clean white canvas — bring your own everything',
    width: 800, height: 600, backgroundColor: '#fafafa', gridSize: 40,
  },
  {
    id: 'blank-dark',
    name: 'Blank (Dark)',
    description: 'Dark canvas with grid',
    width: 800, height: 600, backgroundColor: '#171717', gridSize: 40,
  },
  {
    id: 'chess',
    name: 'Chess Board',
    description: '8×8 classic checkered grid',
    width: 640, height: 640, backgroundColor: '#fafafa', gridSize: 0,
    backgroundImage: checkerboard('#fafafa', '#737373', 80),
  },
  {
    id: 'checkers',
    name: 'Checkers',
    description: 'Red & black 8×8',
    width: 640, height: 640, backgroundColor: '#dc2626', gridSize: 0,
    backgroundImage: checkerboard('#dc2626', '#171717', 80),
  },
  {
    id: 'hex',
    name: 'Hex Map',
    description: 'Hexagonal grid — great for strategy games',
    width: 900, height: 600, backgroundColor: '#0e7490', gridSize: 0,
    backgroundImage: hexPattern('#0e7490', '#7dd3fc'),
  },
  {
    id: 'racetrack',
    name: 'Race Track',
    description: 'Oval track with start line',
    width: 1200, height: 800, backgroundColor: '#15803d', gridSize: 0,
    backgroundImage: racetrackPattern(),
  },
  {
    id: 'track',
    name: 'Linear Path',
    description: '10-square race-to-the-finish track',
    width: 1000, height: 200, backgroundColor: '#1f2937', gridSize: 0,
    backgroundImage: trackPattern(),
  },
  {
    id: 'dungeon',
    name: 'Dungeon',
    description: 'Stone-walled dungeon room',
    width: 800, height: 600, backgroundColor: '#1c1917', gridSize: 40,
    backgroundImage: dungeonPattern(),
  },
  {
    id: 'space',
    name: 'Deep Space',
    description: 'Starfield with subtle grid',
    width: 1000, height: 700, backgroundColor: '#020617', gridSize: 50,
    backgroundImage: dotsPattern('#020617', '#fafafa', 60),
  },
  {
    id: 'sky',
    name: 'Sky',
    description: 'Soft blue with dots',
    width: 800, height: 600, backgroundColor: '#bfdbfe', gridSize: 40,
    backgroundImage: dotsPattern('#dbeafe', '#3b82f6', 60),
  },
  {
    id: 'grass',
    name: 'Grass Field',
    description: 'Green field — perfect for sports games',
    width: 1200, height: 700, backgroundColor: '#15803d', gridSize: 60,
    backgroundImage: stripesPattern('#15803d', '#166534'),
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Cream notebook grid',
    width: 800, height: 600, backgroundColor: '#fef3c7', gridSize: 30,
    backgroundImage: gridPattern('#fef3c7', '#d97706', 30),
  },
  {
    id: 'trivia',
    name: 'Quiz Show',
    description: 'Four-quadrant trivia board (A/B/C/D)',
    width: 800, height: 600, backgroundColor: '#0f172a', gridSize: 0,
    backgroundImage: trivia4QPattern(),
  },
  {
    id: 'battleship',
    name: 'Naval Grid',
    description: '10×8 coordinate grid for battle games',
    width: 800, height: 600, backgroundColor: '#0c4a6e', gridSize: 0,
    backgroundImage: battleshipPattern(),
  },
  {
    id: 'stone',
    name: 'Stone Tile',
    description: 'Heavy stone slab pattern',
    width: 800, height: 600, backgroundColor: '#292524', gridSize: 0,
    backgroundImage: stoneTilePattern(),
  },
];

// ---------- card deck templates ----------

export interface DeckTemplate {
  id: string;
  name: string;
  description: string;
  cards: Omit<GameCard, 'id'>[];
}

const card = (name: string, description: string, count = 2): Omit<GameCard, 'id'> =>
  ({ name, description, count });

export const DECK_TEMPLATES: DeckTemplate[] = [
  {
    id: 'chance',
    name: 'Chance Cards',
    description: 'Classic luck-of-the-draw events — move forward, move back, skip turn.',
    cards: [
      card('Lucky!', 'Move forward 3 spaces.', 3),
      card('Unlucky', 'Move back 2 spaces.', 3),
      card('Skip Turn', 'Lose your next turn.', 2),
      card('Extra Turn', 'Take another turn after this one.', 2),
      card('Swap Places', 'Trade positions with another player.', 2),
      card('Jackpot', 'Move forward 5 spaces!', 1),
      card('Disaster', 'Go back to start.', 1),
    ],
  },
  {
    id: 'movement',
    name: 'Movement Cards',
    description: 'Just movement — for race-style games.',
    cards: [
      card('Move 1', 'Move 1 space.', 6),
      card('Move 2', 'Move 2 spaces.', 5),
      card('Move 3', 'Move 3 spaces.', 4),
      card('Move 4', 'Move 4 spaces.', 3),
      card('Move 5', 'Move 5 spaces.', 2),
      card('Move 6', 'Move 6 spaces.', 1),
    ],
  },
  {
    id: 'action',
    name: 'Action Cards',
    description: 'Combat & strategy — attacks, shields, special moves.',
    cards: [
      card('Attack', 'Deal 1 damage to any opponent.', 4),
      card('Shield', 'Block the next attack against you.', 4),
      card('Heal', 'Recover 2 health points.', 3),
      card('Sneak', 'Move silently — opponents skip a turn watching you.', 2),
      card('Trap', 'Place a trap on the board. Next opponent who lands here skips a turn.', 2),
      card('Mega Strike', 'Deal 3 damage to any opponent.', 1),
    ],
  },
  {
    id: 'trivia',
    name: 'Trivia Cards (blank)',
    description: 'Empty trivia deck — write your own questions.',
    cards: [
      card('Question 1', 'Edit me with your trivia question. Reveal the answer after the player attempts.', 1),
      card('Question 2', 'Edit me with your trivia question.', 1),
      card('Question 3', 'Edit me with your trivia question.', 1),
      card('Question 4', 'Edit me with your trivia question.', 1),
      card('Question 5', 'Edit me with your trivia question.', 1),
      card('Question 6', 'Edit me with your trivia question.', 1),
      card('Question 7', 'Edit me with your trivia question.', 1),
      card('Question 8', 'Edit me with your trivia question.', 1),
    ],
  },
  {
    id: 'wild',
    name: 'Wild Cards',
    description: 'High-variance chaos — reshuffles, swaps, wild effects.',
    cards: [
      card('Reverse', 'Turn order reverses.', 2),
      card('Shuffle', 'All players randomize positions.', 2),
      card('Steal', 'Take a card from any opponent.', 2),
      card('Mirror', 'Copy the last card someone played.', 1),
      card('Double Down', 'Your next roll counts twice.', 2),
      card('Wild', 'Do anything — host decides.', 1),
    ],
  },
  {
    id: 'questions',
    name: 'Conversation Starters',
    description: 'Get-to-know-you prompts — great for icebreakers.',
    cards: [
      card("What's your favorite movie?", 'Share with the group.', 1),
      card('Best meal ever?', 'Describe it in detail.', 1),
      card('Dream vacation?', 'Where and why?', 1),
      card('Superpower of choice?', 'Why that one?', 1),
      card('Most embarrassing memory?', 'Share if you dare.', 1),
      card('What makes you laugh?', 'Tell us about it.', 1),
      card('Favorite teacher?', 'And why?', 1),
      card('Hidden talent?', 'Show or describe.', 1),
    ],
  },
];

// ---------- game starter templates ----------

const TEMPLATE_RACE: GameConfig = {
  board: {
    width: 1000, height: 200,
    backgroundColor: '#1f2937', gridSize: 0,
    backgroundImage: trackPattern(),
  },
  pieces: [
    { id: 'p1', name: 'Red Racer',    type: 'token', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('car-front', '#ef4444'), x: 35,  y: 80, width: 50, height: 50 },
    { id: 'p2', name: 'Blue Racer',   type: 'token', color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('car-front', '#3b82f6'), x: 35,  y: 80, width: 50, height: 50 },
    { id: 'p3', name: 'Green Racer',  type: 'token', color: '#22c55e', shape: 'image', imageUrl: lucideIcon('car-front', '#22c55e'), x: 35,  y: 80, width: 50, height: 50 },
    { id: 'p4', name: 'Yellow Racer', type: 'token', color: '#eab308', shape: 'image', imageUrl: lucideIcon('car-front', '#eab308'), x: 35,  y: 80, width: 50, height: 50 },
  ],
  cards: [],
  dice: { enabled: true, count: 1, sides: 6, color: '#fbbf24' },
  features: { enableDice: true, enableCards: false, enableScores: true, enableTurns: true },
  assets: [],
};

const TEMPLATE_TRIVIA: GameConfig = {
  board: {
    width: 800, height: 600,
    backgroundColor: '#0f172a', gridSize: 0,
    backgroundImage: trivia4QPattern(),
  },
  pieces: [
    { id: 't1', name: 'Player 1', type: 'token', color: '#fb7185', shape: 'image', imageUrl: lucideIcon('user', '#fb7185'), x: 100, y: 100, width: 60, height: 60 },
    { id: 't2', name: 'Player 2', type: 'token', color: '#60a5fa', shape: 'image', imageUrl: lucideIcon('user', '#60a5fa'), x: 100, y: 100, width: 60, height: 60 },
  ],
  cards: DECK_TEMPLATES.find(d => d.id === 'trivia')!.cards.map((c, i) => ({ ...c, id: `tc${i}` })),
  dice: { enabled: false, count: 1, sides: 6 },
  features: { enableDice: false, enableCards: true, enableScores: true, enableTurns: true },
  assets: [],
};

const TEMPLATE_DUNGEON: GameConfig = {
  board: {
    width: 800, height: 600,
    backgroundColor: '#1c1917', gridSize: 40,
    backgroundImage: dungeonPattern(),
  },
  pieces: [
    { id: 'h1', name: 'Hero',      type: 'token', color: '#22c55e', shape: 'image', imageUrl: lucideIcon('swords',  '#22c55e'), x: 80,  y: 280, width: 50, height: 50 },
    { id: 'm1', name: 'Monster A', type: 'token', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('skull',   '#ef4444'), x: 400, y: 200, width: 50, height: 50 },
    { id: 'm2', name: 'Monster B', type: 'token', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('bug',     '#ef4444'), x: 500, y: 350, width: 50, height: 50 },
    { id: 'g1', name: 'Treasure',  type: 'token', color: '#facc15', shape: 'image', imageUrl: lucideIcon('gem',     '#facc15'), x: 700, y: 280, width: 50, height: 50 },
  ],
  cards: DECK_TEMPLATES.find(d => d.id === 'action')!.cards.map((c, i) => ({ ...c, id: `dc${i}` })),
  dice: { enabled: true, count: 2, sides: 20, color: '#dc2626' },
  features: { enableDice: true, enableCards: true, enableScores: true, enableTurns: true },
  assets: [],
};

const TEMPLATE_CHESS: GameConfig = {
  board: {
    width: 640, height: 640,
    backgroundColor: '#fafafa', gridSize: 80,
    backgroundImage: checkerboard('#fafafa', '#737373', 80),
  },
  pieces: (() => {
    const ps: GamePiece[] = [];
    const placePawn = (color: string, label: string, x: number, y: number) => {
      ps.push({ id: `${label}-${x}-${y}`, name: label, type: 'token', color, shape: 'image',
                imageUrl: lucideIcon('crown', color), x, y, width: 60, height: 60 });
    };
    for (let i = 0; i < 8; i++) {
      placePawn('#171717', 'Black Pawn', 10 + i * 80, 90);
      placePawn('#fafafa', 'White Pawn', 10 + i * 80, 490);
    }
    return ps;
  })(),
  cards: [],
  dice: { enabled: false, count: 1, sides: 6 },
  features: { enableDice: false, enableCards: false, enableScores: false, enableTurns: true },
  assets: [],
};

const TEMPLATE_BATTLESHIP: GameConfig = {
  board: {
    width: 800, height: 600,
    backgroundColor: '#0c4a6e', gridSize: 0,
    backgroundImage: battleshipPattern(),
  },
  pieces: [
    { id: 'sh1', name: 'Carrier',     type: 'token', color: '#fafafa', shape: 'image', imageUrl: lucideIcon('ship',     '#fafafa'), x: 100, y: 100, width: 60, height: 60 },
    { id: 'sh2', name: 'Destroyer',   type: 'token', color: '#facc15', shape: 'image', imageUrl: lucideIcon('sailboat', '#facc15'), x: 200, y: 100, width: 60, height: 60 },
    { id: 'sh3', name: 'Submarine',   type: 'token', color: '#7dd3fc', shape: 'image', imageUrl: lucideIcon('anchor',   '#7dd3fc'), x: 300, y: 100, width: 60, height: 60 },
    { id: 'sh4', name: 'Patrol Boat', type: 'token', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('sailboat', '#ef4444'), x: 400, y: 100, width: 60, height: 60 },
  ],
  cards: [],
  dice: { enabled: true, count: 2, sides: 10, color: '#0ea5e9' },
  features: { enableDice: true, enableCards: false, enableScores: true, enableTurns: true },
  assets: [],
};

const TEMPLATE_HEX: GameConfig = {
  board: {
    width: 900, height: 600,
    backgroundColor: '#0e7490', gridSize: 0,
    backgroundImage: hexPattern('#0e7490', '#7dd3fc'),
  },
  pieces: [
    { id: 'hex1', name: 'Red Team',   type: 'token', color: '#ef4444', shape: 'image', imageUrl: lucideIcon('flag',   '#ef4444'), x: 80,  y: 280, width: 50, height: 50 },
    { id: 'hex2', name: 'Blue Team',  type: 'token', color: '#3b82f6', shape: 'image', imageUrl: lucideIcon('flag',   '#3b82f6'), x: 770, y: 280, width: 50, height: 50 },
  ],
  cards: DECK_TEMPLATES.find(d => d.id === 'action')!.cards.map((c, i) => ({ ...c, id: `hxc${i}` })),
  dice: { enabled: true, count: 1, sides: 6 },
  features: { enableDice: true, enableCards: true, enableScores: true, enableTurns: true },
  assets: [],
};

const TEMPLATE_BLANK: GameConfig = {
  board: {
    width: 800, height: 600,
    backgroundColor: '#fafafa', gridSize: 40,
  },
  pieces: [],
  cards: [],
  dice: { enabled: true, count: 1, sides: 6 },
  features: { enableDice: true, enableCards: true, enableScores: true, enableTurns: true },
  assets: [],
};

export interface StarterGame {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  config: GameConfig;
}

export const STARTER_GAMES: StarterGame[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    tagline: 'Start from scratch',
    emoji: '✨',
    description: 'Empty board, no pieces, no cards. Build whatever you want from the ground up.',
    config: TEMPLATE_BLANK,
  },
  {
    id: 'race',
    name: 'Race to the Finish',
    tagline: 'First across the line wins',
    emoji: '🏁',
    description: 'Linear 10-square track with 4 racers. Roll the die, move your car, first to the finish wins.',
    config: TEMPLATE_RACE,
  },
  {
    id: 'trivia',
    name: 'Quiz Show',
    tagline: 'A/B/C/D trivia battle',
    emoji: '❓',
    description: 'Four-quadrant trivia board. Draw a question card, players move to A/B/C/D, score points.',
    config: TEMPLATE_TRIVIA,
  },
  {
    id: 'dungeon',
    name: 'Dungeon Crawl',
    tagline: 'Heroes vs monsters',
    emoji: '⚔️',
    description: 'Stone-walled dungeon, heroes start on the left, monsters in the middle, treasure on the right. d20s included.',
    config: TEMPLATE_DUNGEON,
  },
  {
    id: 'chess',
    name: 'Chess Setup',
    tagline: '8×8 checkered grid',
    emoji: '♟️',
    description: '8×8 chess board with pawns pre-placed. Edit pieces to make your own variant.',
    config: TEMPLATE_CHESS,
  },
  {
    id: 'battleship',
    name: 'Naval Battle',
    tagline: '10×8 grid + ships',
    emoji: '🚢',
    description: 'Coordinate grid for battleship-style games. 4 ships pre-placed. d10s for shots.',
    config: TEMPLATE_BATTLESHIP,
  },
  {
    id: 'hex',
    name: 'Hex Strategy',
    tagline: 'Territory & tactics',
    emoji: '🛡️',
    description: 'Hexagonal map with two team flags. Move across the board capturing territory.',
    config: TEMPLATE_HEX,
  },
];
