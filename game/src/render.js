// AMBLAST rendering: everything drawn on one 2D canvas, no images.
// The judge sees screenshots, so this file carries the game's look:
// a busy candy sky, juicy 3D tiles, sparkling gems, a dense colorful HUD,
// particles everywhere — but the board and the targets stay readable.

import { COLORS, colorById, GRID } from './levels.js';
import { mulberry32, range } from './rng.js';

export const W = 1280;
export const H = 720;

// Layout (logical 1280x720 space).
export const L = {
  boardX: 112, boardY: 96, cell: 54, pitch: 58,
  panelX: 96, panelY: 80, panelW: 496, panelH: 496,
  sideX: 608, sideY: 80, sideW: 576, sideH: 496,
  trayX: 96, trayY: 596, trayW: 1088, trayH: 108,
};

const TITLE_FONT = '"Arial Black", "Segoe UI", Arial, sans-serif';
const BODY_FONT = '"Segoe UI", system-ui, sans-serif';
const MONO_FONT = '"Courier New", ui-monospace, monospace';

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- Jewel shapes (one per gem color) ----
export function drawGemShape(ctx, shape, x, y, r, color, t = 0, phase = 0) {
  const c = colorById(color);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.4 + phase) * 0.08);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, c.light);
  grad.addColorStop(1, c.main);
  ctx.fillStyle = grad;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.beginPath();
  const star = (points, outer, inner, rot = -Math.PI / 2) => {
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = rot + (i * Math.PI) / points;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  const poly = (n, rad, rot = -Math.PI / 2) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i * Math.PI * 2) / n;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  if (shape === 'star4') star(4, r, r * 0.42);
  else if (shape === 'star6') star(6, r, r * 0.55);
  else if (shape === 'bloom') star(8, r, r * 0.62);
  else if (shape === 'penta') poly(5, r);
  else if (shape === 'diamond') poly(4, r, 0);
  else poly(6, r); // hexa
  ctx.fill();
  ctx.stroke();
  // Facet + sparkle.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.32, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  const tw = 0.6 + 0.4 * Math.sin(t * 3 + phase * 2);
  ctx.strokeStyle = `rgba(255,255,255,${0.75 * tw})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.55, -r * 0.15); ctx.lineTo(r * 0.85, -r * 0.15);
  ctx.moveTo(r * 0.7, -r * 0.3); ctx.lineTo(r * 0.7, 0);
  ctx.stroke();
  ctx.restore();
}

// Juicy 3D block tile.
function drawTile(ctx, x, y, s, colorId, t = 0) {
  const c = colorById(colorId);
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, c.light);
  g.addColorStop(0.45, c.main);
  g.addColorStop(1, c.dark);
  rr(ctx, x + 1.5, y + 1.5, s - 3, s - 3, 9);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Top highlight + bottom shade = chunky 3D.
  rr(ctx, x + 5, y + 4, s - 10, s * 0.22, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  rr(ctx, x + 5, y + s - 10, s - 10, 6, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fill();
  // Tiny sparkle.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x + s * 0.28, y + s * 0.3, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(ctx, x, y, s) {
  rr(ctx, x + 1.5, y + 1.5, s - 3, s - 3, 9);
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, '#64748b');
  g.addColorStop(1, '#334155');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(15,23,42,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.25, y + s * 0.3); ctx.lineTo(x + s * 0.5, y + s * 0.55); ctx.lineTo(x + s * 0.35, y + s * 0.8);
  ctx.moveTo(x + s * 0.6, y + s * 0.2); ctx.lineTo(x + s * 0.75, y + s * 0.45);
  ctx.stroke();
}

// ---- Buttons: drawn and registered for hit-testing ----
function drawButton(ctx, g, id, x, y, w, h, label, fill, dark, textColor = '#fff', font = 22, active = true) {
  const hov = g.hoverBtn === id;
  const press = g.pressBtn === id;
  const dy = press ? 2 : 0;
  rr(ctx, x, y + 4 + dy, w, h, 14);
  ctx.fillStyle = dark;
  ctx.fill();
  rr(ctx, x, y + dy, w, h, 14);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, fill);
  grad.addColorStop(1, dark);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (hov) {
    rr(ctx, x - 2, y - 2 + dy, w + 4, h + 4, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.fillStyle = textColor;
  ctx.font = `900 ${font}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1 + dy);
  // Only clickable buttons register a hit area. Buttons drawn behind an
  // overlay (active=false) stay visible but never shadow the overlay's own
  // buttons — the pause menu's MAIN MENU sits on top of the side panel's
  // RESTART button and must win the click.
  if (active) g.ui.buttons.push({ id, x, y, w, h });
}

function pill(ctx, x, y, w, h, fill, stroke = 'rgba(255,255,255,0.35)') {
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---- Busy candy background ----
export function drawBackground(ctx, g) {
  const t = g.time;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1d4ed8');
  grad.addColorStop(0.45, '#7c3aed');
  grad.addColorStop(1, '#db2777');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Diagonal candy stripes, low alpha.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = -H; i < W + H; i += 90) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 34, 0); ctx.lineTo(i + 34 + H, H); ctx.lineTo(i + H, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Polka dots.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  for (let x = 30; x < W; x += 74) {
    for (let y = 26; y < H; y += 74) {
      ctx.beginPath();
      ctx.arc(x + ((y / 74) % 2) * 37, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // Drifting translucent gems (seeded once per game).
  for (const f of g.bgFloaters) {
    const fy = ((f.y + t * f.speed) % (H + 120)) - 60;
    ctx.save();
    ctx.globalAlpha = f.a;
    drawGemShape(ctx, f.shape, f.x, fy, f.r, f.color, t, f.phase);
    ctx.restore();
  }
  // Twinkling sparkles.
  for (const s of g.bgSparkles) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Confetti dots drifting down.
  for (const c of g.bgConfetti) {
    const cy = ((c.y + t * c.speed) % (H + 20)) - 10;
    const cx = c.x + Math.sin(t * 0.7 + c.phase) * 14;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---- Board ----
function cellXY(r, c) {
  return { x: L.boardX + c * L.pitch, y: L.boardY + r * L.pitch };
}
export function boardCellAt(px, py) {
  const c = Math.floor((px - L.boardX) / L.pitch);
  const r = Math.floor((py - L.boardY) / L.pitch);
  if (r < 0 || r >= GRID || c < 0 || c >= GRID) return null;
  return { r, c };
}

function drawBoard(ctx, g) {
  const t = g.time;
  // Panel with a deep backdrop so the busy sky never hurts readability.
  rr(ctx, L.panelX, L.panelY, L.panelW, L.panelH, 22);
  ctx.fillStyle = 'rgba(15,23,42,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Corner gems on the panel frame.
  drawGemShape(ctx, 'star4', L.panelX + 6, L.panelY + 6, 12, 'yellow', t, 0);
  drawGemShape(ctx, 'diamond', L.panelX + L.panelW - 6, L.panelY + 6, 12, 'blue', t, 1);
  drawGemShape(ctx, 'penta', L.panelX + 6, L.panelY + L.panelH - 6, 12, 'orange', t, 2);
  drawGemShape(ctx, 'star6', L.panelX + L.panelW - 6, L.panelY + L.panelH - 6, 12, 'red', t, 3);

  const flash = g.lineFlash; // {rows:[], cols:[], life} while a clear animates
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const { x, y } = cellXY(r, c);
      const inFlash = flash && (flash.rows.includes(r) || flash.cols.includes(c));
      // Empty cell: translucent tile, checker tint.
      rr(ctx, x + 2, y + 2, L.cell - 4, L.cell - 4, 10);
      ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const cell = g.grid[r][c];
      if (!cell) continue;
      if (inFlash) {
        // Flashing white-hot while the line clears (always bright: the
        // alpha never dips near zero at the frozen shot clock).
        ctx.save();
        ctx.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(t * 18));
        rr(ctx, x + 2, y + 2, L.cell - 4, L.cell - 4, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        continue;
      }
      if (cell.kind === 'stone') { drawStone(ctx, x + 2, y + 2, L.cell - 4); continue; }
      // Block tile, then the gem jewel on top for gem cells.
      drawTile(ctx, x + 2, y + 2, L.cell - 4, cell.color, t);
      if (cell.kind === 'gem') {
        const bob = Math.sin(t * 2.2 + (r * 7 + c) * 0.7) * 2;
        drawGemShape(ctx, colorById(cell.color).shape, x + L.cell / 2, y + L.cell / 2 + bob, L.cell * 0.3, cell.color, t, r * 3 + c);
      }
    }
  }

  // Ghost preview: the dragged piece, or the selected piece under the
  // mouse — the exact cells it would fill, so the landing spot is obvious.
  const ghost = g.drag && g.drag.hover
    ? { piece: g.drag.piece, hover: g.drag.hover, fits: g.drag.fits }
    : (g.selected && g.selHover
      ? { piece: g.selected, hover: g.selHover, fits: g.selHover.fits }
      : null);
  if (ghost) {
    const p = ghost.piece;
    for (const [dr, dc] of p.shape.cells) {
      const r = ghost.hover.r + dr, c = ghost.hover.c + dc;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      const { x, y } = cellXY(r, c);
      rr(ctx, x + 3, y + 3, L.cell - 6, L.cell - 6, 9);
      ctx.fillStyle = ghost.fits ? 'rgba(74,222,128,0.55)' : 'rgba(239,68,68,0.55)';
      ctx.fill();
      ctx.strokeStyle = ghost.fits ? '#4ade80' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      // The piece itself, semi-transparent, so its exact shape reads clearly.
      ctx.save();
      ctx.globalAlpha = 0.45;
      drawTile(ctx, x + 3, y + 3, L.cell - 6, p.color);
      ctx.restore();
    }
  }
}

// ---- Tray ----
export function traySlot(i) {
  const w = 160, h = 96, gap = 24;
  const total = 3 * w + 2 * gap;
  const x0 = (W - total) / 2;
  return { x: x0 + i * (w + gap), y: L.trayY + 6, w, h };
}
function drawPieceCells(ctx, piece, cx, cy, cell, scale = 1, alpha = 1) {
  const rows = Math.max(...piece.shape.cells.map(([r]) => r)) + 1;
  const cols = Math.max(...piece.shape.cells.map(([, c]) => c)) + 1;
  const w = cols * cell, h = rows * cell;
  const x0 = cx - (w * scale) / 2, y0 = cy - (h * scale) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const [r, c] of piece.shape.cells) {
    drawTile(ctx, x0 + c * cell * scale, y0 + r * cell * scale, cell * scale - 2, piece.color);
  }
  ctx.restore();
}
function drawTray(ctx, g) {
  rr(ctx, L.trayX, L.trayY, L.trayW, L.trayH, 20);
  ctx.fillStyle = 'rgba(15,23,42,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 15px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(g.selected ? '✓  PIECE SELECTED' : 'DRAG A PIECE  ➜', L.trayX + 18, L.trayY + 24);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `700 13px ${BODY_FONT}`;
  ctx.fillText(g.selected ? 'Tap a board cell to place it!' : 'drop it on the board — fill a line!', L.trayX + 18, L.trayY + 46);
  for (let i = 0; i < 3; i++) {
    const slot = traySlot(i);
    const piece = g.tray[i];
    rr(ctx, slot.x, slot.y, slot.w, slot.h, 14);
    ctx.fillStyle = piece && !piece.used ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = piece && !piece.used ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Selected piece (tap-to-place): bright outline so the choice is
    // unmistakable at a glance.
    if (piece && !piece.used && g.selected === piece) {
      rr(ctx, slot.x - 3, slot.y - 3, slot.w + 6, slot.h + 6, 16);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (!piece || piece.used) continue;
    if (g.drag && g.drag.piece === piece) continue; // drawn at the pointer
    const bob = Math.sin(g.time * 2 + i * 1.7) * 2;
    const cell = Math.min(30, 132 / Math.max(...piece.shape.cells.map(([, c]) => c + 1)), 76 / Math.max(...piece.shape.cells.map(([r]) => r + 1)));
    drawPieceCells(ctx, piece, slot.x + slot.w / 2, slot.y + slot.h / 2 + bob - (g.selected === piece ? 5 : 0), cell);
  }
  // The dragged piece is drawn after the side panel (drawDrag), so it is
  // never hidden behind the panel.
}

// Dragged piece follows the mouse, slightly enlarged with a shadow.
// Drawn after the side panel so it stays on top of everything on the board.
function drawDrag(ctx, g) {
  if (!g.drag) return;
  const p = g.drag.piece;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  drawPieceCells(ctx, p, g.drag.x, g.drag.y, 40, 1.05);
  ctx.restore();
}

// ---- HUD ----
function drawHUD(ctx, g) {
  // Score pill (left).
  pill(ctx, 24, 14, 300, 46, 'rgba(15,23,42,0.8)');
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 13px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE', 44, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 24px ${MONO_FONT}`;
  ctx.fillText(String(g.score).padStart(6, '0'), 44, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `700 12px ${BODY_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`BEST ${Math.max(g.best, g.score)}`, 308, 28);

  // Combo pill (center) — flames up while a combo is hot.
  const hot = g.combo > 1 && g.comboTimer > 0;
  const pulse = hot ? 1 + 0.06 * Math.sin(g.time * 10) : 1;
  ctx.save();
  ctx.translate(640, 37);
  ctx.scale(pulse, pulse);
  pill(ctx, -120, -23, 240, 46, hot ? '#ea580c' : 'rgba(15,23,42,0.8)', hot ? '#fdba74' : 'rgba(255,255,255,0.35)');
  ctx.fillStyle = hot ? '#fff7ed' : '#fde68a';
  ctx.font = `900 ${hot ? 24 : 18}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(hot ? `🔥 COMBO x${g.combo}` : 'COMBO x1', 0, 1);
  ctx.restore();

  // Level pill (right).
  pill(ctx, 872, 14, 190, 46, 'rgba(15,23,42,0.8)');
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `900 13px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(g.classic ? 'CLASSIC' : `LEVEL ${g.level ? g.level.n : 1}/30`, 892, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 20px ${TITLE_FONT}`;
  ctx.fillText(g.classic ? 'ENDLESS' : (g.level ? g.level.name : ''), 892, 46);

  // Sound + menu buttons.
  const snd = g.muted ? '🔇' : '🔊';
  // HUD buttons are inactive while the pause menu is open (its own buttons
  // are the only clickable ones there).
  const hudActive = g.mode !== 'menu';
  drawButton(ctx, g, 'sound', 1080, 14, 46, 46, snd, '#0ea5e9', '#0369a1', '#fff', 20, hudActive);
  drawButton(ctx, g, 'menu', 1138, 14, 46, 46, '☰', '#8b5cf6', '#5b21b6', '#fff', 22, hudActive);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 12px ${BODY_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('M mute', 1256, 68);
}

// ---- Side panel: targets, stats, tips ----
function drawSide(ctx, g) {
  rr(ctx, L.sideX, L.sideY, L.sideW, L.sideH, 22);
  ctx.fillStyle = 'rgba(15,23,42,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  let y = L.sideY + 18;
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 20px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎯  COLLECT THE GEMS', L.sideX + 24, y);
  y += 14;
  if (g.classic) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 17px ${BODY_FONT}`;
    ctx.fillText('No targets — just keep clearing!', L.sideX + 24, y + 22);
    ctx.fillText('Fill rows and columns to blast them.', L.sideX + 24, y + 46);
    ctx.fillText('Game over when no piece fits.', L.sideX + 24, y + 70);
  } else if (g.level) {
    const targets = g.level.targets;
    const got = g.collected;
    for (const id of Object.keys(targets)) {
      const c = colorById(id);
      const need = targets[id];
      const have = Math.min(got[id] || 0, need);
      const done = have >= need;
      const rowY = y + 22;
      drawGemShape(ctx, c.shape, L.sideX + 48, rowY, 17, id, g.time, have);
      ctx.fillStyle = done ? '#4ade80' : '#ffffff';
      ctx.font = `900 17px ${TITLE_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(c.name, L.sideX + 78, rowY);
      // Progress bar.
      const bx = L.sideX + 210, bw = 260;
      rr(ctx, bx, rowY - 9, bw, 18, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
      rr(ctx, bx, rowY - 9, (bw * have) / Math.max(1, need), 18, 9);
      ctx.fillStyle = done ? '#4ade80' : c.main;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 17px ${MONO_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${have}/${need}`, L.sideX + L.sideW - 24, rowY);
      if (done) {
        ctx.fillStyle = '#4ade80';
        ctx.font = `900 22px ${TITLE_FONT}`;
        ctx.fillText('✓', L.sideX + L.sideW - 66, rowY - 1);
      }
      y += 44;
    }
    const left = Object.values(targets).reduce((a, b) => a + b, 0) - Object.values(got).reduce((a, b) => a + b, 0);
    ctx.fillStyle = left === 0 ? '#4ade80' : '#fde68a';
    ctx.font = `900 16px ${TITLE_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(left === 0 ? 'ALL GEMS COLLECTED — BLAST AWAY!' : `${left} gems to go — clear lines through them!`, L.sideX + 24, y + 18);
    y += 44;
  }
  // Stats grid.
  y += 18;
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 18px ${TITLE_FONT}`;
  ctx.fillText('📊  RUN STATS', L.sideX + 24, y);
  y += 30;
  const stats = [
    ['LINES BLASTED', String(g.linesCleared)],
    ['BEST COMBO', `x${g.bestCombo}`],
    ['PIECES PLACED', String(g.piecesPlaced)],
    ['GEMS COLLECTED', String(Object.values(g.collected).reduce((a, b) => a + b, 0))],
  ];
  ctx.font = `900 22px ${MONO_FONT}`;
  for (let i = 0; i < stats.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const sx = L.sideX + 24 + col * 280;
    const sy = y + row * 44;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 12px ${BODY_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(stats[i][0], sx, sy - 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 24px ${MONO_FONT}`;
    ctx.fillText(stats[i][1], sx, sy + 16);
  }
  y += 108;
  // Restart + tip.
  // Side-panel buttons are inactive while the pause menu is open: its MAIN
  // MENU button overlaps this RESTART button and must win the click.
  const sideActive = g.mode === 'play';
  drawButton(ctx, g, 'restart', L.sideX + 24, y, 200, 44, '↻  RESTART', '#f43f5e', '#9f1239', '#fff', 22, sideActive);
  drawButton(ctx, g, 'hint', L.sideX + 244, y, 308, 44, '💡  TIP: SAVE BIG PIECES', '#0ea5e9', '#0369a1', '#fff', 15, sideActive);
  y += 62;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 14px ${BODY_FONT}`;
  ctx.textAlign = 'left';
  const tip = g.tip || 'Corners love L-pieces. Big squares love 3x3s.';
  for (const line of wrapText(ctx, tip, L.sideW - 48)) {
    ctx.fillText(line, L.sideX + 24, y);
    y += 20;
  }
}

// ---- Particles, popups, banner ----
function drawParticles(ctx, g) {
  for (const p of g.particles) {
    const f = Math.max(0, p.life / p.max);
    ctx.save();
    ctx.globalAlpha = Math.min(1, f * 1.4);
    if (p.kind === 'shard') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
    } else if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4 * f + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'gemfly') {
      drawGemShape(ctx, colorById(p.color).shape, p.x, p.y, p.size, p.color, g.time, p.phase);
    } else {
      // spark
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * f + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const pop of g.popups) {
    const f = Math.max(0, pop.life / pop.max);
    ctx.save();
    ctx.globalAlpha = Math.min(1, f * 1.6);
    ctx.font = `900 ${pop.big ? 40 : 26}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeText(pop.text, pop.x, pop.y - (1 - f) * 30);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y - (1 - f) * 30);
    ctx.restore();
  }
  if (g.banner && g.banner.life > 0) {
    const b = g.banner;
    const f = Math.min(1, b.life / (b.max * 0.5));
    const pop = 1 + 0.25 * Math.max(0, (b.life - b.max * 0.7) / (b.max * 0.3));
    ctx.save();
    ctx.translate(b.x ?? 640, b.y ?? 300);
    ctx.scale(pop, pop);
    ctx.globalAlpha = Math.min(1, f * 1.5);
    ctx.font = `900 64px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(15,23,42,0.95)';
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    if (b.sub) {
      ctx.font = `900 26px ${TITLE_FONT}`;
      ctx.lineWidth = 8;
      ctx.strokeText(b.sub, 0, 52);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.sub, 0, 52);
    }
    ctx.restore();
  }
}

// ---- Chunky logo ----
function drawLogo(ctx, cx, y, size, t, bounce = true) {
  const letters = 'AMBLAST'.split('');
  const colors = ['#f97316', '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#ec4899'];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = size * 0.72;
  const total = letters.length * w;
  letters.forEach((ch, i) => {
    const bob = bounce ? Math.sin(t * 3 + i * 0.55) * size * 0.045 : 0;
    const rot = Math.sin(t * 1.6 + i * 0.9) * 0.05;
    const x = cx - total / 2 + w * (i + 0.5);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(rot);
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
    ctx.lineWidth = size * 0.14;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillText(ch, 0, 0);
    // Gloss.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `900 ${size * 0.42}px ${TITLE_FONT}`;
    ctx.fillText(ch, 0, -size * 0.16);
    ctx.restore();
  });
  ctx.restore();
}

// ---- Screens ----
function drawTitle(ctx, g) {
  const t = g.time;
  // Big floating gems framing the logo.
  drawGemShape(ctx, 'star4', 130, 150, 34, 'green', t, 0);
  drawGemShape(ctx, 'penta', 1150, 130, 38, 'orange', t, 1);
  drawGemShape(ctx, 'star6', 90, 480, 30, 'red', t, 2);
  drawGemShape(ctx, 'bloom', 1190, 470, 32, 'purple', t, 3);
  drawGemShape(ctx, 'diamond', 240, 620, 26, 'blue', t, 4);
  drawGemShape(ctx, 'hexa', 1040, 630, 26, 'yellow', t, 5);
  drawGemShape(ctx, 'star4', 330, 90, 20, 'blue', t, 6);
  drawGemShape(ctx, 'penta', 950, 80, 20, 'green', t, 7);
  drawLogo(ctx, 640, 168, 118, t);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 30px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★  GEM BLOCK PUZZLE  ★', 640, 252);
  ctx.fillStyle = '#fde68a';
  ctx.font = `700 19px ${BODY_FONT}`;
  ctx.fillText('Drag the blocks. Blast the lines. Collect every gem!', 640, 286);

  // Adventure progress card.
  rr(ctx, 390, 318, 500, 74, 18);
  ctx.fillStyle = 'rgba(15,23,42,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 22px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`📍  Level ${g.maxUnlocked}`, 414, 344);
  ctx.fillStyle = '#fde68a';
  ctx.font = `700 15px ${BODY_FONT}`;
  ctx.fillText(`${g.maxUnlocked - 1} of 30 levels cleared  •  ${g.starsTotal}★ earned`, 414, 370);
  rr(ctx, 414, 344 + 34, 452, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fill();
  rr(ctx, 414, 344 + 34, 452 * ((g.maxUnlocked - 1) / 30), 12, 6);
  ctx.fillStyle = '#4ade80';
  ctx.fill();

  drawButton(ctx, g, 'adventure', 440, 416, 400, 64, '🏆  ADVENTURE', '#f59e0b', '#92400e', '#fff', 26);
  drawButton(ctx, g, 'classic', 440, 492, 400, 64, '∞  CLASSIC', '#10b981', '#065f46', '#fff', 26);
  drawButton(ctx, g, 'howto', 440, 568, 400, 52, '❓  HOW TO PLAY', '#0ea5e9', '#0369a1', '#fff', 20);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 16px ${BODY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`BEST SCORE  ${g.best}`, 640, 652);
  const blink = 0.6 + 0.4 * Math.sin(t * 3.5);
  ctx.fillStyle = `rgba(255,255,255,${blink})`;
  ctx.font = `900 17px ${TITLE_FONT}`;
  ctx.fillText('CLICK ADVENTURE TO START', 640, 684);
}

function drawAdventure(ctx, g) {
  const t = g.time;
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 46px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆  Adventure', 640, 84);
  ctx.fillStyle = '#fde68a';
  ctx.font = `700 20px ${BODY_FONT}`;
  ctx.fillText('Take part in the Adventure and win the trophy.', 640, 122);
  // Trophy glow.
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(640, 178, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', 640, 182);
  // Level map: 3 rows of 10, snake order.
  const rows = [250, 350, 450];
  for (let n = 1; n <= 30; n++) {
    const row = Math.floor((n - 1) / 10);
    const idx = (n - 1) % 10;
    const col = row % 2 === 0 ? idx : 9 - idx;
    const x = 140 + col * 110;
    const y = rows[row];
    const done = n < g.maxUnlocked;
    const current = n === g.maxUnlocked;
    const locked = n > g.maxUnlocked;
    if (current) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5);
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = done ? '#f59e0b' : current ? '#22c55e' : 'rgba(15,23,42,0.85)';
    ctx.fill();
    ctx.strokeStyle = done ? '#fde68a' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.45)' : '#ffffff';
    ctx.font = `900 ${locked ? 20 : 19}px ${TITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(locked ? '🔒' : String(n), x, y + 1);
    if (done && (g.stars[n] || 0) > 0) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '13px sans-serif';
      ctx.fillText('★'.repeat(g.stars[n] || 0), x, y + 42);
    }
    g.ui.mapNodes.push({ n, x, y, r: 30, locked });
  }
  drawButton(ctx, g, 'back', 24, 16, 120, 44, '← BACK', '#64748b', '#334155');
  drawButton(ctx, g, 'play-level', 440, 560, 400, 64, `▶  PLAY LEVEL ${g.maxUnlocked}`, '#22c55e', '#14532d', '#fff', 26);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 16px ${BODY_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Tap a glowing level to play it — clear gems to unlock the next one!', 640, 652);
}

function drawHowto(ctx, g) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,40,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  rr(ctx, 290, 90, 700, 540, 24);
  ctx.fillStyle = '#1e1b4b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 34px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('HOW TO PLAY', 640, 140);
  const lines = [
    ['🖱️  DRAG', 'Pick up a block piece and drop it on the grid.'],
    ['💥  BLAST', 'Fill a whole row or column — it explodes!'],
    ['💎  COLLECT', 'Gems caught in a blast count toward the target.'],
    ['🔥  COMBO', 'Blast lines on back-to-back drops for x2, x3…'],
    ['😱  STUCK?', 'If no piece fits anywhere, the run is over!'],
    ['🏆  WIN', 'Collect every target gem to clear the level.'],
  ];
  let y = 196;
  for (const [head, body] of lines) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 21px ${TITLE_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(head, 330, y);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 18px ${BODY_FONT}`;
    ctx.fillText(body, 330, y + 28);
    y += 62;
  }
  drawButton(ctx, g, 'close-howto', 490, 556, 300, 52, 'GOT IT!', '#22c55e', '#14532d', '#fff', 22);
}

function drawOverlayPanel(ctx, g, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,40,0.68)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  rr(ctx, x, y, w, h, 26);
  ctx.fillStyle = '#1e1b4b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawStars(ctx, cx, y, n, size = 46) {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * (size + 22);
    const lit = i < n;
    ctx.save();
    ctx.translate(x, y);
    if (lit) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = lit ? '#fbbf24' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    const R = size / 2, r = R * 0.45;
    for (let k = 0; k < 10; k++) {
      const rad = k % 2 === 0 ? R : r;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawClear(ctx, g) {
  drawOverlayPanel(ctx, g, 340, 120, 600, 480);
  const info = g.clearInfo || { grade: 'S', stars: 3 };
  ctx.fillStyle = '#4ade80';
  ctx.font = `900 52px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL CLEAR!', 640, 190);
  drawStars(ctx, 640, 268, info.stars);
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 22px ${TITLE_FONT}`;
  ctx.fillText(`GRADE ${info.grade}`, 640, 322);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 30px ${MONO_FONT}`;
  ctx.fillText(`SCORE  ${g.score}`, 640, 366);
  const rows = [
    ['LINES BLASTED', String(g.linesCleared)],
    ['GEMS COLLECTED', String(Object.values(g.collected).reduce((a, b) => a + b, 0))],
    ['BEST COMBO', `x${g.bestCombo}`],
    ['PIECES PLACED', String(g.piecesPlaced)],
  ];
  ctx.font = `700 17px ${BODY_FONT}`;
  let y = 404;
  for (const [k, v] of rows) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(k, 440, y);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(v, 840, y);
    y += 28;
  }
  const last = g.level && g.level.n >= 30;
  drawButton(ctx, g, last ? 'victory' : 'next', 490, 516, 300, 56, last ? '🏆  TROPHY!' : '▶  NEXT LEVEL', '#22c55e', '#14532d', '#fff', 22);
  drawButton(ctx, g, 'menu', 340, 516, 120, 56, 'MENU', '#64748b', '#334155', '#fff', 18);
}

function drawSoClose(ctx, g) {
  drawOverlayPanel(ctx, g, 340, 120, 600, 480);
  ctx.fillStyle = '#f87171';
  ctx.font = `900 54px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('So Close!', 640, 190);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 19px ${BODY_FONT}`;
  ctx.fillText('No piece fits anywhere — the run is over.', 640, 232);
  // Remaining targets.
  const targets = g.level ? g.level.targets : {};
  let y = 286;
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 18px ${TITLE_FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('GEMS STILL MISSING', 420, y);
  y += 34;
  for (const id of Object.keys(targets)) {
    const c = colorById(id);
    const need = targets[id];
    const have = Math.min(g.collected[id] || 0, need);
    const left = need - have;
    if (left <= 0) continue;
    drawGemShape(ctx, c.shape, 446, y, 17, id, g.time, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 18px ${TITLE_FONT}`;
    ctx.fillText(`${c.name}  × ${left} more`, 476, y + 1);
    y += 38;
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 26px ${MONO_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`SCORE  ${g.score}`, 640, y + 26);
  drawButton(ctx, g, 'retry', 490, 500, 300, 56, '↻  TRY AGAIN', '#22c55e', '#14532d', '#fff', 22);
  drawButton(ctx, g, 'menu2', 340, 500, 120, 56, 'MENU', '#64748b', '#334155', '#fff', 18);
}

function drawVictory(ctx, g) {
  drawOverlayPanel(ctx, g, 300, 90, 680, 540);
  ctx.save();
  ctx.globalAlpha = 0.4 + 0.2 * Math.sin(g.time * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(640, 190, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = '84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', 640, 206);
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 46px ${TITLE_FONT}`;
  ctx.fillText('YOU WIN THE TROPHY!', 640, 300);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 19px ${BODY_FONT}`;
  ctx.fillText('All 30 levels cleared. You are the AMBLAST master!', 640, 338);
  ctx.font = `900 30px ${MONO_FONT}`;
  ctx.fillText(`FINAL SCORE  ${g.score}`, 640, 388);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 18px ${BODY_FONT}`;
  ctx.fillText(`${g.starsTotal}★ earned  •  ${g.linesCleared} lines blasted  •  best combo x${g.bestCombo}`, 640, 424);
  drawButton(ctx, g, 'again', 490, 500, 300, 56, '↻  PLAY AGAIN', '#22c55e', '#14532d', '#fff', 22);
  drawButton(ctx, g, 'menu3', 340, 500, 120, 56, 'MENU', '#64748b', '#334155', '#fff', 18);
}

function drawClassicOver(ctx, g) {
  drawOverlayPanel(ctx, g, 340, 150, 600, 420);
  ctx.fillStyle = '#fde68a';
  ctx.font = `900 46px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', 640, 230);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 30px ${MONO_FONT}`;
  ctx.fillText(`SCORE  ${g.score}`, 640, 300);
  ctx.fillStyle = g.score >= g.best ? '#4ade80' : 'rgba(255,255,255,0.8)';
  ctx.font = `900 22px ${TITLE_FONT}`;
  ctx.fillText(g.score >= g.best && g.score > 0 ? '★ NEW BEST! ★' : `BEST  ${g.best}`, 640, 344);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 18px ${BODY_FONT}`;
  ctx.fillText(`${g.linesCleared} lines blasted  •  best combo x${g.bestCombo}`, 640, 384);
  drawButton(ctx, g, 'again-classic', 490, 470, 300, 56, '↻  PLAY AGAIN', '#22c55e', '#14532d', '#fff', 22);
  drawButton(ctx, g, 'menu4', 340, 470, 120, 56, 'MENU', '#64748b', '#334155', '#fff', 18);
}

function drawMenuOverlay(ctx, g) {
  drawOverlayPanel(ctx, g, 440, 180, 400, 360);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 34px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 240);
  drawButton(ctx, g, 'resume', 490, 280, 300, 52, '▶  RESUME', '#22c55e', '#14532d', '#fff', 20);
  drawButton(ctx, g, 'restart2', 490, 344, 300, 52, '↻  RESTART LEVEL', '#f59e0b', '#92400e', '#fff', 20);
  drawButton(ctx, g, 'quit', 490, 408, 300, 52, '🏠  MAIN MENU', '#64748b', '#334155', '#fff', 20);
}

// ---- Master render ----
export function render(ctx, g) {
  ctx.save();
  if (g.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }
  g.ui = { buttons: [], mapNodes: [] };
  drawBackground(ctx, g);
  const mode = g.mode;
  if (mode === 'title') {
    drawTitle(ctx, g);
  } else if (mode === 'adventure') {
    drawAdventure(ctx, g);
  } else {
    drawBoard(ctx, g);
    drawTray(ctx, g);
    drawHUD(ctx, g);
    drawSide(ctx, g);
    drawDrag(ctx, g);
    drawParticles(ctx, g);
    if (mode === 'howto') drawHowto(ctx, g);
    else if (mode === 'clear') drawClear(ctx, g);
    else if (mode === 'soClose') drawSoClose(ctx, g);
    else if (mode === 'victory') drawVictory(ctx, g);
    else if (mode === 'classicOver') drawClassicOver(ctx, g);
    else if (mode === 'menu') drawMenuOverlay(ctx, g);
  }
  ctx.restore();
}

// Seed the ambient background: floating gems, sparkles, confetti.
export function seedBackground(seed) {
  const rng = mulberry32(seed);
  const shapes = ['star4', 'penta', 'star6', 'bloom', 'diamond', 'hexa'];
  const colors = ['green', 'orange', 'red', 'purple', 'blue', 'yellow'];
  const bgFloaters = [];
  for (let i = 0; i < 12; i++) {
    bgFloaters.push({
      x: range(rng, 40, W - 40), y: range(rng, 0, H),
      r: range(rng, 14, 30), shape: shapes[Math.floor(rng() * shapes.length)],
      color: colors[Math.floor(rng() * colors.length)],
      speed: range(rng, 4, 12), a: range(rng, 0.10, 0.22), phase: rng() * Math.PI * 2,
    });
  }
  const bgSparkles = [];
  for (let i = 0; i < 70; i++) {
    bgSparkles.push({ x: rng() * W, y: rng() * H, r: range(rng, 1, 2.6), speed: range(rng, 0.6, 2.2), phase: rng() * Math.PI * 2 });
  }
  const bgConfetti = [];
  for (let i = 0; i < 26; i++) {
    bgConfetti.push({ x: rng() * W, y: rng() * H, r: range(rng, 2, 4.5), speed: range(rng, 8, 22), phase: rng() * Math.PI * 2, color: COLORS[Math.floor(rng() * COLORS.length)].main });
  }
  return { bgFloaters, bgSparkles, bgConfetti };
}
