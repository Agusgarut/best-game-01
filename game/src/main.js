// AMBLAST — a gem block puzzle.
// Drag chunky blocks onto the 8x8 grid, blast full rows and columns,
// collect every target gem. Vanilla JS, canvas 2D, no libraries, no network.

import { GRID, COLORS, buildLevel, buildClassic, dealTray, emptyGrid, fitsPiece, anyFit, findLines, clearLines, LEVEL_NAMES } from './levels.js';
import { mulberry32 } from './rng.js';
import { render, seedBackground, traySlot, boardCellAt, L } from './render.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const TIPS = [
  'Corners love L-pieces. Big squares love 3x3s.',
  'Clear two lines at once for a huge bonus!',
  'Save the 3x3 for the endgame — it fits almost nowhere.',
  'Gems only count when their line blasts. Aim through them!',
  'A combo builds when every drop blasts a line.',
  'Stuck? Stone tiles never leave — plan around them.',
];

function loadNum(key, def) {
  try { return Number(window.localStorage.getItem(key) || String(def)) || def; } catch { return def; }
}
function saveNum(key, v) {
  try { window.localStorage.setItem(key, String(v)); } catch { /* no storage */ }
}
function loadStars() {
  try { return JSON.parse(window.localStorage.getItem('amblast-stars') || '{}'); } catch { return {}; }
}
function saveStars(s) {
  try { window.localStorage.setItem('amblast-stars', JSON.stringify(s)); } catch { /* no storage */ }
}

const bg = seedBackground(7);
let trayRng = mulberry32((Date.now() % 100000) + 11);

const g = {
  mode: 'title',
  prevMode: 'title',
  classic: false,
  level: null,
  grid: emptyGrid(),
  tray: [],
  score: 0,
  best: loadNum('amblast-best', 0),
  collected: {},
  combo: 1,
  comboTimer: 0,
  bestCombo: 1,
  linesCleared: 0,
  piecesPlaced: 0,
  drag: null,
  selected: null,
  selHover: null,
  particles: [],
  popups: [],
  banner: null,
  lineFlash: null,
  pendingClear: null,
  shake: 0,
  time: 0,
  muted: false,
  maxUnlocked: Math.min(30, Math.max(1, loadNum('amblast-unlocked', 1))),
  stars: loadStars(),
  starsTotal: 0,
  clearInfo: null,
  tip: TIPS[0],
  tipIdx: 0,
  hoverBtn: null,
  pressBtn: null,
  locked: false,
  bgFloaters: bg.bgFloaters,
  bgSparkles: bg.bgSparkles,
  bgConfetti: bg.bgConfetti,
  ui: { buttons: [], mapNodes: [] },
};
g.starsTotal = Object.values(g.stars).reduce((a, b) => a + b, 0);

function resetRunStats() {
  g.linesCleared = 0;
  g.piecesPlaced = 0;
  g.bestCombo = 1;
  g.combo = 1;
  g.comboTimer = 0;
}

function startLevel(n) {
  const level = buildLevel(n);
  g.classic = false;
  g.level = level;
  g.grid = level.grid;
  g.collected = {};
  for (const id of Object.keys(level.targets)) g.collected[id] = 0;
  g.score = 0;
  g.tray = dealTray(trayRng);
  g.drag = null;
  g.selected = null;
  g.selHover = null;
  g.particles = [];
  g.popups = [];
  g.banner = null;
  g.lineFlash = null;
  g.pendingClear = null;
  g.locked = false;
  resetRunStats();
  g.mode = 'play';
  g.tip = TIPS[n % TIPS.length];
}

function startClassic() {
  g.classic = true;
  g.level = buildClassic();
  g.grid = g.level.grid;
  g.collected = {};
  g.score = 0;
  g.tray = dealTray(trayRng);
  g.drag = null;
  g.selected = null;
  g.selHover = null;
  g.particles = [];
  g.popups = [];
  g.banner = null;
  g.lineFlash = null;
  g.pendingClear = null;
  g.locked = false;
  resetRunStats();
  g.mode = 'play';
  g.tip = 'No targets — just keep blasting!';
}

function addPopup(x, y, text, color, big = false) {
  g.popups.push({ x, y, text, color, big, life: 1.1, max: 1.1 });
}
function burst(x, y, color, n = 10, speed = 260) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    g.particles.push({
      kind: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
      life: 0.7, max: 0.7, color, size: 6 + Math.random() * 7,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
    });
  }
  for (let i = 0; i < 6; i++) {
    g.particles.push({
      kind: 'spark', x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 60,
      life: 0.8, max: 0.8, color: '#ffffff', size: 3 + Math.random() * 3,
    });
  }
}
function ring(x, y, color) {
  g.particles.push({ kind: 'ring', x, y, r: 10, life: 0.45, max: 0.45, color });
}

function levelComplete() {
  if (g.classic || !g.level) return false;
  return Object.keys(g.level.targets).every((id) => (g.collected[id] || 0) >= g.level.targets[id]);
}

function finishLevel() {
  const n = g.level.n;
  const par = g.level.par;
  const stars = g.score >= par * 1.2 ? 3 : g.score >= par * 0.7 ? 2 : 1;
  g.clearInfo = { stars, grade: stars === 3 ? 'S' : stars === 2 ? 'A' : 'B' };
  if ((g.stars[n] || 0) < stars) {
    g.stars[n] = stars;
    saveStars(g.stars);
    g.starsTotal = Object.values(g.stars).reduce((a, b) => a + b, 0);
  }
  if (n >= g.maxUnlocked && n < 30) {
    g.maxUnlocked = n + 1;
    saveNum('amblast-unlocked', g.maxUnlocked);
  }
  if (g.score > g.best) {
    g.best = g.score;
    saveNum('amblast-best', g.best);
  }
  g.mode = 'clear';
  sfx.win();
}

function failRun() {
  if (g.classic) {
    if (g.score > g.best) {
      g.best = g.score;
      saveNum('amblast-best', g.best);
    }
    g.mode = 'classicOver';
  } else {
    g.mode = 'soClose';
  }
  sfx.lose();
}

function checkStuck() {
  const usable = g.tray.filter((p) => !p.used);
  if (usable.length === 0) return; // dealt fresh below
  const stuck = usable.every((p) => !anyFit(g.grid, p));
  if (stuck) failRun();
}

function dealIfNeeded() {
  if (g.tray.every((p) => p.used)) {
    g.tray = dealTray(trayRng);
  }
  checkStuck();
}

function placePiece(piece, r0, c0) {
  for (const [dr, dc] of piece.shape.cells) {
    g.grid[r0 + dr][c0 + dc] = { kind: 'block', color: piece.color };
  }
  piece.used = true;
  g.piecesPlaced++;
  g.score += piece.shape.cells.length * 10;
  sfx.drop();
  for (const [dr, dc] of piece.shape.cells) {
    const x = L.boardX + (c0 + dc) * L.pitch + L.cell / 2;
    const y = L.boardY + (r0 + dr) * L.pitch + L.cell / 2;
    burst(x, y, COLORS.find((c) => c.id === piece.color).main, 3, 120);
  }
  const lines = findLines(g.grid);
  const lineCount = lines.rows.length + lines.cols.length;
  if (lineCount > 0) {
    g.consec = (g.consec || 0) + 1;
    g.combo = Math.max(1, g.consec);
    g.comboTimer = 3;
    g.bestCombo = Math.max(g.bestCombo, g.combo);
    g.locked = true;
    g.lineFlash = { rows: lines.rows, cols: lines.cols, life: 0.4, max: 0.4 };
    g.pendingClear = lines;
    sfx.clear(g.combo);
    g.shake = 5 + lineCount * 2;
    // Rings at the center of each cleared line.
    for (const r of lines.rows) ring(L.boardX + 4 * L.pitch, L.boardY + r * L.pitch + L.cell / 2, '#ffffff');
    for (const c of lines.cols) ring(L.boardX + c * L.pitch + L.cell / 2, L.boardY + 4 * L.pitch, '#ffffff');
  } else {
    g.consec = 0;
    g.combo = 1;
    dealIfNeeded();
  }
}

function executeClear() {
  const lines = g.pendingClear;
  g.pendingClear = null;
  g.lineFlash = null;
  g.locked = false;
  const lineCount = lines.rows.length + lines.cols.length;
  // Collect gems before clearing (clearLines returns them).
  const gems = clearLines(g.grid, lines);
  g.linesCleared += lineCount;
  let pts = lineCount * 100 * g.combo + gems.length * 50;
  g.score += pts;
  // Gems fly to the side-panel target list.
  const targetIds = g.classic ? [] : Object.keys(g.level.targets);
  gems.forEach((color, i) => {
    if (!g.classic) g.collected[color] = (g.collected[color] || 0) + 1;
    const idx = targetIds.indexOf(color);
    const ty = L.sideY + 40 + Math.max(0, idx) * 44;
    const cell = findGemCell(color);
    g.particles.push({
      kind: 'gemfly', x: cell ? cell.x : 360, y: cell ? cell.y : 300,
      vx: 0, vy: 0, life: 0.55, max: 0.55, color, size: 16, phase: i,
      tx: L.sideX + 48, ty,
    });
  });
  const cx = L.boardX + 4 * L.pitch;
  addPopup(cx, L.boardY - 8, `+${pts}`, '#fde68a', true);
  if (g.combo >= 2) {
    g.banner = { text: `COMBO x${g.combo}!`, sub: `${lineCount} line${lineCount > 1 ? 's' : ''} blasted`, color: '#fb923c', life: 1.0, max: 1.0 };
    sfx.combo(g.combo);
  }
  if (g.combo >= 2) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.particles.push({ kind: 'spark', x: cx + Math.cos(a) * 60, y: 300 + Math.sin(a) * 40, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 40, life: 0.6, max: 0.6, color: '#fde68a', size: 4 });
    }
  }
  if (!g.classic && levelComplete()) {
    setTimeout(() => { if (g.mode === 'play') finishLevel(); }, 650);
  } else {
    dealIfNeeded();
  }
}

function findGemCell(color) {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const cell = g.grid[r][c];
      if (cell && cell.kind === 'gem' && cell.color === color) {
        return { x: L.boardX + c * L.pitch + L.cell / 2, y: L.boardY + r * L.pitch + L.cell / 2 };
      }
    }
  }
  return null;
}

// ---- Input ----
function toGame(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (1280 / rect.width),
    y: (e.clientY - rect.top) * (720 / rect.height),
  };
}
function buttonAt(x, y) {
  // Generous hit area: buttons are small on a phone screen.
  const PAD = 6;
  for (const b of g.ui.buttons) {
    if (x >= b.x - PAD && x <= b.x + b.w + PAD && y >= b.y - PAD && y <= b.y + b.h + PAD) return b.id;
  }
  return null;
}
function mapNodeAt(x, y) {
  for (const n of g.ui.mapNodes) {
    if (Math.hypot(x - n.x, y - n.y) <= n.r + 14) return n;
  }
  return null;
}
function slotAt(x, y) {
  // Expanded slots: the gaps between slots and the whole tray panel count,
  // so starting a drag never needs a precise hit.
  for (let i = 0; i < 3; i++) {
    const s = traySlot(i);
    if (x >= s.x - 11 && x <= s.x + s.w + 11 && y >= L.trayY && y <= L.trayY + L.trayH) return i;
  }
  // Inside the slots' span but between two slots: take the nearest slot.
  if (y >= L.trayY && y <= L.trayY + L.trayH) {
    const first = traySlot(0), last = traySlot(2);
    if (x >= first.x - 11 && x <= last.x + last.w + 11) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < 3; i++) {
        const s = traySlot(i);
        const d = Math.abs(x - (s.x + s.w / 2));
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }
  }
  return -1;
}

function shapeDims(piece) {
  return {
    rows: Math.max(...piece.shape.cells.map(([r]) => r)) + 1,
    cols: Math.max(...piece.shape.cells.map(([, c]) => c)) + 1,
  };
}
// First fitting top-left anchor in the 3x3 neighbourhood of (r0, c0):
// the snap that makes placement forgiving on a small screen.
function findSnap(piece, r0, c0) {
  const order = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of order) {
    if (fitsPiece(g.grid, piece, r0 + dr, c0 + dc)) return { r: r0 + dr, c: c0 + dc };
  }
  return null;
}
// Top-left anchor for a piece whose centre sits at game point (ax, ay).
function anchorFromCenter(piece, ax, ay) {
  const { rows, cols } = shapeDims(piece);
  return {
    r: Math.floor((ay - (rows * L.pitch) / 2 - L.boardY) / L.pitch),
    c: Math.floor((ax - (cols * L.pitch) / 2 - L.boardX) / L.pitch),
  };
}
// Top-left anchor that centres the piece on the tapped board cell.
function anchorForCell(piece, cell) {
  const { rows, cols } = shapeDims(piece);
  return { r: cell.r - Math.floor(rows / 2), c: cell.c - Math.floor(cols / 2) };
}
// How far above the fingertip a touch-dragged piece floats (game units):
// the piece bottom clears the fingertip by FINGER_CLEAR_CSS screen px.
const FINGER_CLEAR_CSS = 40;
function touchLift(piece) {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / 1280;
  const { rows } = shapeDims(piece);
  return (rows * L.pitch) / 2 + FINGER_CLEAR_CSS / scale;
}
// Keep a dragged piece fully on screen.
function clampAnchor(piece, ax, ay) {
  const { rows, cols } = shapeDims(piece);
  const halfW = (cols * L.pitch) / 2, halfH = (rows * L.pitch) / 2;
  return {
    x: Math.min(Math.max(ax, halfW + 6), 1280 - halfW - 6),
    y: Math.min(Math.max(ay, halfH + 6), 720 - halfH - 6),
  };
}
// Recompute a drag's anchor + ghost from the latest pointer position.
function updateDrag(d, p) {
  const ax = p.x;
  const ay = (d.pointerType === 'touch' && d.lifted) ? p.y - d.lift : p.y;
  const a = clampAnchor(d.piece, ax, ay);
  d.x = a.x; d.y = a.y;
  let r, c;
  if (d.fromSelect && !d.moved) {
    // Press-and-hold on a cell with a selected piece: aim at the cell.
    const cell = boardCellAt(p.x, p.y);
    if (!cell) { d.hover = null; d.fits = false; return; }
    ({ r, c } = anchorForCell(d.piece, cell));
  } else {
    // The landing spot follows the FINGER, not the lifted piece: the piece
    // is drawn above the finger so it stays visible, but the player aims
    // with their fingertip. If the ghost followed the lifted piece, the
    // top rows would be unreachable — with the finger on row 0 the piece
    // sits above the board (hover r=-2, no ghost, release denied).
    ({ r, c } = anchorFromCenter(d.piece, p.x, p.y));
  }
  const snap = findSnap(d.piece, r, c);
  if (snap) { d.hover = snap; d.fits = true; }
  else { d.hover = { r, c }; d.fits = false; }
}

function handleButton(id) {
  sfx.click();
  switch (id) {
    case 'adventure': g.mode = 'adventure'; break;
    case 'classic': startClassic(); break;
    case 'howto': g.prevMode = g.mode; g.mode = 'howto'; break;
    case 'close-howto': g.mode = g.prevMode || 'title'; break;
    case 'back': g.mode = 'title'; break;
    case 'play-level': startLevel(g.maxUnlocked); break;
    case 'sound':
      g.muted = !g.muted;
      setMuted(g.muted);
      break;
    case 'menu': g.prevMode = g.mode; g.mode = 'menu'; break;
    case 'menu2': case 'menu3': case 'menu4': case 'quit': g.mode = 'title'; break;
    case 'resume': g.mode = g.prevMode === 'menu' ? 'play' : (g.prevMode || 'play'); break;
    case 'restart': case 'restart2':
      if (g.classic) startClassic(); else if (g.level) startLevel(g.level.n);
      break;
    case 'hint':
      g.tipIdx = (g.tipIdx + 1) % TIPS.length;
      g.tip = TIPS[g.tipIdx];
      break;
    case 'next':
      if (g.level && g.level.n < 30) startLevel(g.level.n + 1);
      break;
    case 'victory': g.mode = 'victory'; break;
    case 'retry': if (g.level) startLevel(g.level.n); break;
    case 'again': g.score = 0; startLevel(1); break;
    case 'again-classic': startClassic(); break;
    default: break;
  }
}

let downPos = null;
let downBtn = null;

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  // Capture the pointer so the drag keeps tracking the finger even if it
  // slides off the canvas edge mid-drag.
  try { canvas.setPointerCapture(e.pointerId); } catch { /* older browser */ }
  const p = toGame(e);
  // A second finger never hijacks an active drag.
  if (g.drag && e.pointerId !== g.drag.pointerId) return;
  downPos = p;
  const btn = buttonAt(p.x, p.y);
  if (btn) { downBtn = btn; g.pressBtn = btn; return; }
  if (g.mode === 'adventure') {
    const node = mapNodeAt(p.x, p.y);
    if (node && !node.locked) { sfx.click(); startLevel(node.n); }
    return;
  }
  if (g.mode !== 'play' || g.locked) return;
  const isTouch = e.pointerType === 'touch';
  const slot = slotAt(p.x, p.y);
  if (slot >= 0) {
    const piece = g.tray[slot];
    if (piece && !piece.used) {
      // Picked up from the tray: on touch the piece lifts above the
      // finger at once, so the grab is visible immediately.
      g.drag = {
        piece, x: p.x, y: p.y, hover: null, fits: false, moved: false, slot,
        pointerId: e.pointerId, pointerType: e.pointerType,
        lift: isTouch ? touchLift(piece) : 0, lifted: isTouch,
        fromSelect: false,
      };
      g.selected = null;
      g.selHover = null;
      updateDrag(g.drag, p);
      sfx.pick();
    }
    return;
  }
  // Press on the board with a selected piece: aim, then release to place.
  // No lift until the finger actually moves, so a plain tap places the
  // piece centred on the tapped cell.
  if (g.selected) {
    const piece = g.selected;
    g.drag = {
      piece, x: p.x, y: p.y, hover: null, fits: false, moved: false, slot: -1,
      pointerId: e.pointerId, pointerType: e.pointerType,
      lift: isTouch ? touchLift(piece) : 0, lifted: false,
      fromSelect: true,
    };
    g.selected = null;
    g.selHover = null;
    updateDrag(g.drag, p);
    sfx.pick();
  }
});

canvas.addEventListener('pointermove', (e) => {
  // Coalesced events give every intermediate touch point, so the drag
  // tracks the finger smoothly instead of jumping between samples.
  const evts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  const p = toGame(evts[evts.length - 1]);
  g.hoverBtn = buttonAt(p.x, p.y);
  if (g.drag) {
    const d = g.drag;
    if (e.pointerId !== d.pointerId) return;
    const thresh = d.pointerType === 'touch' ? 16 : 6;
    if (!d.moved && downPos && Math.hypot(p.x - downPos.x, p.y - downPos.y) > thresh) {
      d.moved = true;
      // The piece lifts off the finger the moment the drag really starts.
      if (d.pointerType === 'touch') d.lifted = true;
    }
    updateDrag(d, p);
    return;
  }
  if (g.selected && g.mode === 'play' && !g.locked) {
    // Desktop hover preview for the selected piece.
    const cell = boardCellAt(p.x, p.y);
    if (cell) {
      const a = anchorForCell(g.selected, cell);
      const snap = findSnap(g.selected, a.r, a.c);
      g.selHover = snap ? { r: snap.r, c: snap.c, fits: true } : { r: a.r, c: a.c, fits: false };
    } else {
      g.selHover = null;
    }
  }
});

canvas.addEventListener('pointerup', (e) => {
  const p = toGame(e);
  if (downBtn) {
    if (buttonAt(p.x, p.y) === downBtn) handleButton(downBtn);
    downBtn = null;
    g.pressBtn = null;
    downPos = null;
    return;
  }
  if (g.drag) {
    const d = g.drag;
    if (e.pointerId !== d.pointerId) return;
    g.drag = null;
    if (!d.moved && !d.fromSelect) {
      // A tap on a tray piece selects it (tap-to-place mode) — a tap
      // must never place the piece straight away, even when the lifted
      // anchor happens to hover over a fitting spot.
      g.selected = d.piece;
      sfx.click();
    } else if (d.hover && d.fits) {
      placePiece(d.piece, d.hover.r, d.hover.c);
      g.selected = null;
    } else {
      // Invalid drop (or a tap on a cell the piece cannot fit): the piece
      // goes back to the tray and any selection is cleared.
      sfx.deny();
      g.selected = null;
    }
    g.selHover = null;
  }
  downPos = null;
});

// A cancelled gesture (browser took the touch back) drops the piece back
// in the tray instead of leaving a drag stuck on screen.
canvas.addEventListener('pointercancel', (e) => {
  if (g.drag && e.pointerId === g.drag.pointerId) g.drag = null;
  downBtn = null;
  g.pressBtn = null;
  downPos = null;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// Belt and braces: the canvas never scrolls, even if the browser ignores
// touch-action for a gesture that starts on it.
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    g.muted = !g.muted;
    setMuted(g.muted);
  } else if ((e.key === 'r' || e.key === 'R') && g.mode === 'play') {
    if (g.classic) startClassic(); else if (g.level) startLevel(g.level.n);
  } else if (e.key === 'Escape' && g.mode === 'play') {
    g.prevMode = 'play';
    g.mode = 'menu';
  }
});

// ---- Main loop ----
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  g.time += dt;
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) { g.combo = 1; g.consec = 0; }
  }
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 26);
  if (g.lineFlash) {
    g.lineFlash.life -= dt;
    if (g.lineFlash.life <= 0) executeClear();
  }
  for (const p of g.particles) {
    p.life -= dt;
    if (p.kind === 'gemfly') {
      // Fly toward the target counter.
      const k = 1 - Math.pow(0.0018, dt);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      p.r = (p.r || 10) + dt * 260;
    } else if (p.kind === 'ring') {
      p.r += dt * 320;
    } else {
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.vy !== undefined) p.vy += 420 * dt;
      if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    }
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const pop of g.popups) pop.life -= dt;
  g.popups = g.popups.filter((p) => p.life > 0);
  if (g.banner) {
    g.banner.life -= dt;
    if (g.banner.life <= 0) g.banner = null;
  }
  render(ctx, g);
  requestAnimationFrame(frame);
}

// ---- Boot ----
if (shotName) {
  applyShot(g, shotName, seed);
  render(ctx, g);
  document.title = 'shot-ready';
} else {
  requestAnimationFrame(frame);
}

window.AMBLAST = {
  game: g,
  startLevel,
  startClassic,
  levels: { buildLevel, buildClassic },
  LEVEL_NAMES,
};
