// AMBLAST — level data, piece library, gem types, and the pure grid rules.
// Everything here is deterministic: level N always builds the same board
// from its seed, so replays and staged screenshots are stable.

import { mulberry32 } from './rng.js';

export const GRID = 8;

// The six candy colors. Every gem and every block uses one of these; each
// gem color also has its own jewel shape so targets stay readable at a
// glance (green = 4-point star, orange = pentagon, red = 6-point star,
// purple = 8-point bloom, blue = diamond, yellow = hexagon).
export const COLORS = [
  { id: 'green', name: 'GREEN', main: '#22c55e', light: '#86efac', dark: '#14532d', glow: 'rgba(34,197,94,0.55)', shape: 'star4' },
  { id: 'orange', name: 'ORANGE', main: '#f97316', light: '#fdba74', dark: '#7c2d12', glow: 'rgba(249,115,22,0.55)', shape: 'penta' },
  { id: 'red', name: 'RED', main: '#ef4444', light: '#fca5a5', dark: '#7f1d1d', glow: 'rgba(239,68,68,0.55)', shape: 'star6' },
  { id: 'purple', name: 'PURPLE', main: '#a855f7', light: '#d8b4fe', dark: '#581c87', glow: 'rgba(168,85,247,0.55)', shape: 'bloom' },
  { id: 'blue', name: 'BLUE', main: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', glow: 'rgba(59,130,246,0.55)', shape: 'diamond' },
  { id: 'yellow', name: 'YELLOW', main: '#eab308', light: '#fde047', dark: '#713f12', glow: 'rgba(234,179,8,0.55)', shape: 'hexa' },
];
export const colorById = (id) => COLORS.find((c) => c.id === id) || COLORS[0];
// Gem colors used per level: 2 early, up to 5 later (yellow stays a block
// color only, so the target row never gets crowded).
export const gemColorsForLevel = (n) =>
  n <= 4 ? ['green', 'orange']
    : n <= 9 ? ['green', 'orange', 'red']
    : n <= 14 ? ['green', 'orange', 'red', 'purple']
    : ['green', 'orange', 'red', 'purple', 'blue'];

// ---- Piece library: polyominoes. cells are [row, col] offsets. ----
export const PIECES = [
  { name: 'DOT', w: 1, cells: [[0, 0]] },
  { name: 'I2', w: 3, cells: [[0, 0], [0, 1]] },
  { name: 'I3', w: 3, cells: [[0, 0], [0, 1], [0, 2]] },
  { name: 'I4', w: 2, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { name: 'I5', w: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: 'V2', w: 3, cells: [[0, 0], [1, 0]] },
  { name: 'V3', w: 2, cells: [[0, 0], [1, 0], [2, 0]] },
  { name: 'V4', w: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: 'SQ2', w: 3, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { name: 'SQ3', w: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { name: 'R23', w: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { name: 'R32', w: 2, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  { name: 'L3A', w: 2, cells: [[0, 0], [1, 0], [1, 1]] },
  { name: 'L3B', w: 2, cells: [[0, 0], [0, 1], [1, 1]] },
  { name: 'L3C', w: 2, cells: [[0, 0], [0, 1], [1, 0]] },
  { name: 'L3D', w: 2, cells: [[0, 1], [1, 0], [1, 1]] },
  { name: 'L4A', w: 1, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { name: 'L4B', w: 1, cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { name: 'L4C', w: 1, cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { name: 'L4D', w: 1, cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { name: 'T', w: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { name: 'TD', w: 1, cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { name: 'S', w: 1, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { name: 'Z', w: 1, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { name: 'PLUS', w: 1, cells: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { name: 'CORN', w: 1, cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
];

export function pickPiece(rng) {
  let total = 0;
  for (const p of PIECES) total += p.w;
  let roll = rng() * total;
  for (const p of PIECES) {
    roll -= p.w;
    if (roll <= 0) return p;
  }
  return PIECES[0];
}

// Deal a fresh tray of three pieces.
export function dealTray(rng) {
  const tray = [];
  for (let i = 0; i < 3; i++) {
    const shape = pickPiece(rng);
    tray.push({
      shape,
      color: COLORS[Math.floor(rng() * COLORS.length)].id,
      used: false,
      id: i,
    });
  }
  return tray;
}

// ---- Pure grid helpers. A cell is null, {kind:'block',color},
// {kind:'gem',color}, or {kind:'stone'}. Stone counts as filled for a
// line clear but never leaves the board. ----
export const key = (r, c) => `${r},${c}`;
export function emptyGrid() {
  return Array.from({ length: GRID }, () => Array(GRID).fill(null));
}
export function fitsPiece(grid, piece, r0, c0) {
  for (const [dr, dc] of piece.shape.cells) {
    const r = r0 + dr, c = c0 + dc;
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
}
export function anyFit(grid, piece) {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (fitsPiece(grid, piece, r, c)) return true;
    }
  }
  return false;
}
// Full rows/columns: every cell non-null (stone counts as filled).
export function findLines(grid) {
  const rows = [], cols = [];
  for (let r = 0; r < GRID; r++) {
    if (grid[r].every((cell) => cell !== null)) rows.push(r);
  }
  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) if (grid[r][c] === null) { full = false; break; }
    if (full) cols.push(c);
  }
  return { rows, cols };
}
// Remove cleared cells (gems and blocks go, stone stays). Returns the gems
// collected, as a list of color ids.
export function clearLines(grid, lines) {
  const gems = [];
  const doCell = (r, c) => {
    const cell = grid[r][c];
    if (!cell || cell.kind === 'stone') return;
    if (cell.kind === 'gem') gems.push(cell.color);
    grid[r][c] = null;
  };
  for (const r of lines.rows) for (let c = 0; c < GRID; c++) doCell(r, c);
  for (const c of lines.cols) for (let r = 0; r < GRID; r++) doCell(r, c);
  return gems;
}

// ---- Level names (30, hand-written so the map reads like an adventure). ----
export const LEVEL_NAMES = [
  'FIRST SPARK', 'WARM UP', 'GEM GARDEN', 'CANDY CROSS', 'RING AROUND',
  'DOUBLE TROUBLE', 'CORNER POCKET', 'STONE AGE', 'RAINBOW ROAD', 'CLUSTER BOMB',
  'THE GAUNTLET', 'SPIRAL STAIR', 'GEM RUSH', 'BLOCK PARTY', 'TIGHT SQUEEZE',
  'FIVE ALARM', 'THE VAULT', 'CROSSFIRE', 'HIDDEN GEMS', 'FULL HOUSE',
  'THE MAZE', 'GEM STORM', 'DOUBLE CROSS', 'THE FORTRESS', 'RAINBOW RUSH',
  'THE CRUCIBLE', 'GEM AVALANCHE', 'THE LABYRINTH', 'FINAL COUNTDOWN', 'THE TROPHY',
];

// Build level n (1-based). Deterministic from its seed.
export function buildLevel(n) {
  const rng = mulberry32(7000 + n * 131);
  const gemColors = gemColorsForLevel(n);
  const grid = emptyGrid();
  const stone = new Set();
  const targets = {};
  for (const id of gemColors) targets[id] = 0;

  const freeCell = (r, c) => grid[r][c] === null && !stone.has(key(r, c));
  const putGem = (r, c) => {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID || !freeCell(r, c)) return false;
    const color = gemColors[Math.floor(rng() * gemColors.length)];
    grid[r][c] = { kind: 'gem', color };
    targets[color]++;
    return true;
  };
  const putBlock = (r, c) => {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID || !freeCell(r, c)) return false;
    const color = COLORS[Math.floor(rng() * COLORS.length)].id;
    grid[r][c] = { kind: 'block', color };
    return true;
  };
  const putStone = (r, c) => {
    if (r < 0 || r >= GRID || c < 0 || c >= GRID || grid[r][c] !== null) return false;
    grid[r][c] = { kind: 'stone' };
    stone.add(key(r, c));
    return true;
  };

  // Stone obstacles from level 6 on (a few cells, shaped).
  if (n >= 6) {
    const count = Math.min(2 + Math.floor((n - 6) / 4), 6);
    const spots = [[3, 3], [3, 4], [4, 3], [4, 4], [0, 0], [0, 7], [7, 0], [7, 7], [2, 6], [6, 2]];
    for (let i = 0; i < count; i++) {
      const [r, c] = spots[Math.floor(rng() * spots.length)];
      putStone(r, c);
    }
  }

  // Gem layout: one or two patterns per level.
  const gemCount = Math.min(6 + n, 30);
  const patterns = ['scatter', 'ring', 'cross', 'corners', 'clusters', 'border'];
  const pattern = patterns[Math.floor(rng() * patterns.length)];
  const pattern2 = patterns[Math.floor(rng() * patterns.length)];
  const placePattern = (p, budget) => {
    let placed = 0, guard = 0;
    const tryPut = (r, c) => { if (putGem(r, c)) placed++; };
    if (p === 'scatter') {
      while (placed < budget && guard++ < 300) tryPut(Math.floor(rng() * GRID), Math.floor(rng() * GRID));
    } else if (p === 'ring') {
      const rr = [2, 3, 4, 5];
      for (const r of rr) for (const c of rr) {
        if (placed >= budget) return placed;
        if (r === 2 || r === 5 || c === 2 || c === 5) tryPut(r, c);
      }
    } else if (p === 'cross') {
      for (let i = 0; i < GRID && placed < budget; i++) { tryPut(3, i); tryPut(4, i); tryPut(i, 3); tryPut(i, 4); }
    } else if (p === 'corners') {
      const corners = [[0, 0], [0, 1], [1, 0], [1, 1], [0, 6], [0, 7], [1, 6], [1, 7], [6, 0], [6, 1], [7, 0], [7, 1], [6, 6], [6, 7], [7, 6], [7, 7]];
      for (const [r, c] of corners) { if (placed >= budget) break; tryPut(r, c); }
    } else if (p === 'clusters') {
      for (let k = 0; k < 3 && placed < budget; k++) {
        const r0 = 1 + Math.floor(rng() * 5), c0 = 1 + Math.floor(rng() * 5);
        for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) { if (placed >= budget) break; tryPut(r0 + dr, c0 + dc); }
      }
    } else { // border
      for (let i = 0; i < GRID && placed < budget; i++) { tryPut(0, i); tryPut(7, i); tryPut(i, 0); tryPut(i, 7); }
    }
    return placed;
  };
  let placed = placePattern(pattern, Math.ceil(gemCount * 0.6));
  if (placed < gemCount) placed += placePattern(pattern2, gemCount - placed);
  if (placed < gemCount) placePattern('scatter', gemCount - placed);

  // Pre-filled colored blocks: density grows with the level.
  const prefill = Math.min(Math.floor((n - 1) * 0.9), 12);
  let guard = 0;
  for (let i = 0; i < prefill && guard++ < 200; i++) {
    if (!putBlock(Math.floor(rng() * GRID), Math.floor(rng() * GRID))) i--;
  }

  return {
    n,
    name: LEVEL_NAMES[n - 1] || `LEVEL ${n}`,
    grid,
    targets,
    gemTotal: Object.values(targets).reduce((a, b) => a + b, 0),
    // Star thresholds: score targets for 1/2/3 stars (tuned by gems + par).
    par: 800 + n * 120,
  };
}

// Classic mode: an empty board, no gems, no targets — endless scoring.
export function buildClassic() {
  return { n: 0, name: 'CLASSIC', grid: emptyGrid(), targets: {}, gemTotal: 0, par: 0 };
}
