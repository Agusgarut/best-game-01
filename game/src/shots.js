// AMBLAST staged screenshots: deterministic scenes rendered by the real
// game code behind ?shot=start|play|clear|end&seed=1. Nothing here is a mock
// image — each scene is a real game state, frozen at a fixed clock time,
// so the same URL always renders the same frame.

import { mulberry32 } from './rng.js';
import { GRID, COLORS, PIECES, buildLevel } from './levels.js';
import { L } from './render.js';

// Frozen clock: sin(2.244 * 3.5) ≈ 1, so blinking prompts render at full
// brightness, and every idle bob/sparkle lands on the same frame.
const FROZEN_T = 2.244;

function resetCommon(g) {
  g.time = FROZEN_T;
  g.shake = 0;
  g.particles = [];
  g.popups = [];
  g.banner = null;
  g.lineFlash = null;
  g.pendingClear = null;
  g.drag = null;
  g.selected = null;
  g.locked = false;
  g.muted = true;
}

function fillBoard(g, rng, density) {
  // Scatter colored blocks over the empty cells until the board looks busy.
  let guard = 0;
  let target = Math.floor(GRID * GRID * density);
  let filled = 0;
  while (filled < target && guard++ < 500) {
    const r = Math.floor(rng() * GRID);
    const c = Math.floor(rng() * GRID);
    if (g.grid[r][c] === null) {
      g.grid[r][c] = { kind: 'block', color: COLORS[Math.floor(rng() * COLORS.length)].id };
      filled++;
    }
  }
}

function findPiece(name) {
  return PIECES.find((p) => p.name === name);
}

function makeTray(specs) {
  return specs.map(([name, color], i) => ({ shape: findPiece(name), color, used: false, id: i }));
}

// Put the game into a frozen, photogenic state for a screenshot.
// Returns true when a known shot was applied.
export function applyShot(g, name, seed) {
  const rng = mulberry32(seed * 101 + 7);
  resetCommon(g);

  if (name === 'start') {
    g.mode = 'title';
    g.best = 4860;
    g.maxUnlocked = 7;
    g.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 1 };
    g.starsTotal = 14;
    g.score = 0;
    return true;
  }

  if (name === 'play') {
    // Level 7 GEM RUSH, mid-game: a busy colorful board, three pieces in
    // the tray, one I3 piece mid-drag with a green ghost preview, combo x3.
    const level = buildLevel(7);
    g.classic = false;
    g.level = level;
    g.grid = level.grid;
    g.collected = {};
    for (const id of Object.keys(level.targets)) g.collected[id] = 0;
    g.collected.green = 4;
    g.collected.orange = 3;
    g.collected.red = 2;
    fillBoard(g, rng, 0.42);
    // Clear a landing spot for the dragged I3 and keep it empty.
    for (const [dr, dc] of [[0, 0], [0, 1], [0, 2]]) g.grid[2 + dr][2 + dc] = null;
    g.score = 2840;
    g.combo = 3;
    g.comboTimer = 2.5;
    g.bestCombo = 4;
    g.linesCleared = 5;
    g.piecesPlaced = 12;
    g.tray = makeTray([['SQ2', 'green'], ['I3', 'blue'], ['L3A', 'red']]);
    const dragPiece = g.tray[1];
    g.drag = { piece: dragPiece, x: 315, y: 239, hover: { r: 2, c: 2 }, fits: true, moved: true, slot: 1 };
    // Sparkle burst where the last gem was collected + score popup.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.particles.push({
        kind: 'spark', x: 300 + Math.cos(a) * 26, y: 200 + Math.sin(a) * 26,
        vx: 0, vy: 0, life: 0.6, max: 0.6, color: i % 2 ? '#fde68a' : '#fbbf24', size: 4,
      });
    }
    g.popups.push({ x: 360, y: 150, text: '+400  COMBO x3', color: '#fbbf24', big: true, life: 0.9, max: 0.9 });
    g.mode = 'play';
    g.tip = 'Corners love L-pieces. Big squares love 3x3s.';
    return true;
  }

  if (name === 'clear') {
    // Level 8 CROSSFIRE, the big blast: row 3 and column 5 flash white-hot,
    // shards and rings frozen mid-explosion, gems flying to the target list.
    const level = buildLevel(8);
    g.classic = false;
    g.level = level;
    g.grid = level.grid;
    g.collected = {};
    for (const id of Object.keys(level.targets)) g.collected[id] = 0;
    g.collected.green = 5;
    g.collected.orange = 4;
    g.collected.red = 3;
    fillBoard(g, rng, 0.38);
    // Force row 3 and column 5 full so the flash reads as a real clear.
    for (let c = 0; c < GRID; c++) {
      if (g.grid[3][c] === null) g.grid[3][c] = { kind: 'block', color: COLORS[c % COLORS.length].id };
    }
    for (let r = 0; r < GRID; r++) {
      if (g.grid[r][5] === null) g.grid[r][5] = { kind: 'block', color: COLORS[r % COLORS.length].id };
    }
    // One gem in the cleared row so a gem flies to the target panel.
    g.grid[3][2] = { kind: 'gem', color: 'green' };
    g.grid[3][6] = { kind: 'gem', color: 'red' };
    g.score = 5210;
    g.combo = 5;
    g.comboTimer = 2.8;
    g.bestCombo = 5;
    g.linesCleared = 9;
    g.piecesPlaced = 18;
    g.tray = makeTray([['T', 'purple'], ['SQ3', 'yellow'], ['I4', 'orange']]);
    g.lineFlash = { rows: [3], cols: [5], life: 0.25, max: 0.4 };
    // Frozen explosion: shards, rings, flying gems, big popup, banner.
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI * 2;
      const d = 20 + rng() * 90;
      g.particles.push({
        kind: 'shard', x: 360 + Math.cos(a) * d, y: 270 + Math.sin(a) * d,
        vx: 0, vy: 0, life: 0.6, max: 0.6,
        color: COLORS[Math.floor(rng() * COLORS.length)].main,
        size: 6 + rng() * 7, rot: rng() * Math.PI, vr: 0,
      });
    }
    g.particles.push({ kind: 'ring', x: 360, y: 270, r: 70, life: 0.4, max: 0.45, color: '#ffffff' });
    g.particles.push({ kind: 'ring', x: 420, y: 270, r: 46, life: 0.35, max: 0.45, color: '#fde68a' });
    g.particles.push({ kind: 'gemfly', x: 300, y: 250, vx: 0, vy: 0, life: 0.4, max: 0.55, color: 'green', size: 17, phase: 0, tx: 656, ty: 140, r: 10 });
    g.particles.push({ kind: 'gemfly', x: 430, y: 290, vx: 0, vy: 0, life: 0.45, max: 0.55, color: 'red', size: 17, phase: 1, tx: 656, ty: 228, r: 10 });
    g.popups.push({ x: 340, y: 120, text: '+1450  COMBO x5', color: '#fde68a', big: true, life: 0.9, max: 0.9 });
    g.banner = { text: 'COMBO x5!', sub: '2 lines blasted', color: '#fb923c', life: 0.8, max: 1.0, x: 360, y: 330 };
    g.shake = 0;
    g.mode = 'play';
    g.tip = 'Clear two lines at once for a huge bonus!';
    return true;
  }

  if (name === 'end') {
    // Level 7 cleared: LEVEL CLEAR! with three stars, grade S, score and
    // a stats grid — the victory moment.
    const level = buildLevel(7);
    g.classic = false;
    g.level = level;
    g.grid = level.grid;
    g.collected = {};
    for (const id of Object.keys(level.targets)) g.collected[id] = level.targets[id];
    g.score = 4860;
    g.best = 4860;
    g.combo = 1;
    g.bestCombo = 5;
    g.linesCleared = 8;
    g.piecesPlaced = 21;
    g.tray = makeTray([['SQ2', 'green'], ['I3', 'blue'], ['L3A', 'red']]);
    g.clearInfo = { stars: 3, grade: 'S' };
    g.mode = 'clear';
    return true;
  }

  return false;
}
