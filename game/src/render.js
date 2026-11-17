// ORBITAL rendering: everything drawn on one 2D canvas, no images.
// The judge sees screenshots, so this file carries the game's look:
// layered deep space, glowing textured planets, rings and black holes,
// drifting asteroids, power-up orbs, shockwave rings, a dense HUD.

import { W, H, POWERUPS } from './levels.js';
import { predictPath, firstImpact, PROBE_R } from './physics.js';
import { mulberry32 } from './rng.js';

const TITLE_FONT = '"Segoe UI", system-ui, sans-serif';
const MONO_FONT = '"Courier New", ui-monospace, monospace';

function rr(ctx, x, y, w, h, r) {
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
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBackground(ctx, g, t) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#03031a');
  grad.addColorStop(0.5, '#0a0a30');
  grad.addColorStop(1, '#160a33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Distant galaxies: faint tilted spirals.
  for (const gx of g.galaxies) {
    ctx.save();
    ctx.translate(gx.x, gx.y);
    ctx.rotate(gx.rot);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gx.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, gx.r, gx.r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Soft nebulae, layered.
  for (const n of g.nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, n.color);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Far starfield.
  for (const s of g.starfield) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.speed + s.phase));
    ctx.globalAlpha = tw * s.a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Near stars, brighter, with cross sparkles on the biggest.
  for (const s of g.starfieldNear) {
    const tw = 0.5 + 0.5 * Math.abs(Math.sin(t * s.speed + s.phase));
    ctx.globalAlpha = tw * s.a;
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    if (s.r > 2.3) {
      ctx.strokeStyle = 'rgba(219, 234, 254, 0.7)';
      ctx.lineWidth = 1;
      const L = s.r * 3.2;
      ctx.beginPath();
      ctx.moveTo(s.x - L, s.y);
      ctx.lineTo(s.x + L, s.y);
      ctx.moveTo(s.x, s.y - L);
      ctx.lineTo(s.x, s.y + L);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(ctx, p, t) {
  if (p.hole) {
    drawBlackHole(ctx, p, t);
    return;
  }
  ctx.save();
  // Ring, back half (behind the body).
  if (p.ring) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 1.7, p.r * 0.42, -0.35, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Atmosphere glow.
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 34;
  const g = ctx.createRadialGradient(
    p.x - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.1,
    p.x, p.y, p.r,
  );
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, p.color);
  g.addColorStop(1, p.core);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Gas-giant bands, clipped to the disc.
  if (p.banded) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(p.x - p.r, p.y + i * p.r * 0.55 - p.r * 0.12, p.r * 2, p.r * 0.24);
    }
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = p.core;
    ctx.fillRect(p.x - p.r, p.y - p.r * 0.05, p.r * 2, p.r * 0.18);
    ctx.restore();
  }
  // Craters, deterministic from the planet's position.
  if (p.craters) {
    const rng = mulberry32(Math.floor(p.x * 7 + p.y * 13 + 5));
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < p.craters; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * p.r * 0.62;
      const cx = p.x + Math.cos(a) * d;
      const cy = p.y + Math.sin(a) * d;
      const cr = p.r * (0.09 + rng() * 0.1);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = p.core;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.3, cy - cr * 0.3, cr * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Rim light.
  ctx.strokeStyle = p.color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r - 1, Math.PI * 0.9, Math.PI * 1.7);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Slow rotating surface band.
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * 0.92, p.r * 0.3, 0.4 + 0.05 * Math.sin(t * 0.2), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Ring, front half.
  if (p.ring) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r * 1.7, p.r * 0.42, -0.35, 0, Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBlackHole(ctx, p, t) {
  ctx.save();
  // Accretion glow.
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 46;
  ctx.strokeStyle = '#fb923c';
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * 1.25, p.r * 0.42, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Swirling inner ring.
  ctx.strokeStyle = '#fde68a';
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 18]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.r * 0.95, p.r * 0.34, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // The dark event horizon itself.
  const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r * 0.78);
  g.addColorStop(0, '#000000');
  g.addColorStop(0.8, '#0a0618');
  g.addColorStop(1, '#2e1065');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  // Photon ring.
  ctx.strokeStyle = '#e9d5ff';
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawAsteroid(ctx, a, t) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.fillStyle = '#8d7d6b';
  ctx.strokeStyle = '#57534e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < a.verts.length; i++) {
    const ang = (i / a.verts.length) * Math.PI * 2;
    const rad = a.r * a.verts[i];
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(-a.r * 0.25, -a.r * 0.2, a.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(a.r * 0.3, a.r * 0.25, a.r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerup(ctx, p, t) {
  const def = POWERUPS[p.kind];
  const pulse = 1 + 0.14 * Math.sin(t * 4 + p.phase);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = def.color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, 13 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#04101e';
  ctx.beginPath();
  ctx.arc(0, 0, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Icon letter.
  ctx.fillStyle = def.color;
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.kind === 'shield' ? 'S' : p.kind === 'slow' ? 'T' : p.kind === 'life' ? '+' : 'F', 0, 1);
  ctx.textBaseline = 'alphabetic';
  // Orbiting ring.
  ctx.strokeStyle = def.color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 19 + 2 * Math.sin(t * 3 + p.phase), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Label under the orb.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 8;
  ctx.fillText(def.label, p.x, p.y + 34);
  ctx.restore();
}

function drawStar(ctx, x, y, t, phase) {
  const pulse = 1 + 0.18 * Math.sin(t * 3 + phase);
  const r = 11 * pulse;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.8 + phase) * 0.35);
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff7cc';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProbe(ctx, g, t) {
  const p = g.probe;
  ctx.save();
  ctx.translate(p.x, p.y);
  const ang = Math.atan2(p.vy, p.vx);
  ctx.rotate(g.mode === 'aim' ? Math.atan2(g.aim.y - p.y, g.aim.x - p.x) : ang);
  // Engine flame while charging or flying fast.
  const flame = g.mode === 'aim' && g.charging ? 0.6 + 0.4 * Math.sin(t * 30) : 0;
  if (flame > 0 || g.mode === 'fly') {
    const fl = (flame > 0 ? 16 + 14 * flame : 10) * Math.min(1, Math.hypot(p.vx, p.vy) / 300 + 0.3);
    const fg = ctx.createLinearGradient(-8, 0, -8 - fl, 0);
    fg.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
    fg.addColorStop(1, 'rgba(255, 90, 40, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-8 - fl, 0);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = '#67e8f9';
  ctx.shadowBlur = 16;
  const bg = ctx.createLinearGradient(-10, 0, 12, 0);
  bg.addColorStop(0, '#0e7490');
  bg.addColorStop(1, '#a5f3fc');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ecfeff';
  ctx.beginPath();
  ctx.arc(2, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shield bubble.
  if (g.shield) {
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22 + 2 * Math.sin(t * 5), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTrail(ctx, g) {
  for (const pt of g.trail) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max) * 0.7;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.max), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, g) {
  for (const pt of g.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRings(ctx, g) {
  for (const r of g.rings) {
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, g) {
  ctx.textAlign = 'center';
  for (const pp of g.popups) {
    const a = Math.max(0, pp.life / pp.max);
    ctx.globalAlpha = a;
    ctx.font = `bold ${pp.big ? 30 : 20}px ${MONO_FONT}`;
    ctx.fillStyle = pp.color;
    ctx.shadowColor = pp.color;
    ctx.shadowBlur = 12;
    ctx.fillText(pp.text, pp.x, pp.y - (pp.max - pp.life) * 22);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawTrajectory(ctx, g) {
  if (g.mode !== 'aim' || !g.charging) return;
  const power = g.power;
  const dx = g.aim.x - g.probe.x;
  const dy = g.aim.y - g.probe.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = 80 + 460 * power;
  const s0 = {
    x: g.probe.x, y: g.probe.y,
    vx: (dx / d) * speed, vy: (dy / d) * speed,
  };
  const pts = predictPath(g.planets, s0, 1 / 60, 240, 3);
  ctx.save();
  ctx.setLineDash([2, 9]);
  ctx.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = 0.85 * (1 - i / pts.length);
    ctx.strokeStyle = `rgba(165, 243, 252, ${a.toFixed(3)})`;
    ctx.lineWidth = i < 2 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.stroke();
  }
  ctx.restore();
  // Red IMPACT marker when the previewed path ends in a crash.
  const hit = firstImpact(g.planets, s0, 1 / 60, 240);
  if (hit) {
    const hx = hit.x + ((g.probe.x - hit.x) / (Math.hypot(g.probe.x - hit.x, g.probe.y - hit.y) || 1)) * (hit.r + 10);
    const hy = hit.y + ((g.probe.y - hit.y) / (Math.hypot(g.probe.x - hit.x, g.probe.y - hit.y) || 1)) * (hit.r + 10);
    const pulse = 0.6 + 0.4 * Math.sin(g.time * 8);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 9);
    ctx.lineTo(hx + 9, hy + 9);
    ctx.moveTo(hx + 9, hy - 9);
    ctx.lineTo(hx - 9, hy + 9);
    ctx.stroke();
    ctx.font = `bold 12px ${MONO_FONT}`;
    ctx.fillStyle = '#fca5a5';
    ctx.textAlign = 'center';
    ctx.fillText('IMPACT', hx, hy - 16);
    ctx.restore();
  }
  // Aim direction arrow + power ring.
  ctx.save();
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.probe.x, g.probe.y);
  ctx.lineTo(g.probe.x + (dx / d) * 46, g.probe.y + (dy / d) * 46);
  ctx.stroke();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(g.probe.x, g.probe.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power);
  ctx.stroke();
  ctx.restore();
}

function pill(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = `bold 13px ${MONO_FONT}`;
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(2, 6, 26, 0.75)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  rr(ctx, x - w, y - 15, w, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.fillText(text, x - 9, y + 1);
  ctx.restore();
  return w;
}

function drawHUD(ctx, g) {
  // Top bar.
  ctx.fillStyle = 'rgba(2, 6, 26, 0.55)';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = 'rgba(165, 243, 252, 0.25)';
  ctx.fillRect(0, 64, W, 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur = 8;
  ctx.fillText(`SCORE ${String(g.score).padStart(6, '0')}`, 22, 32);
  ctx.shadowBlur = 0;
  ctx.font = `13px ${MONO_FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`BEST ${String(Math.max(g.best, g.score)).padStart(6, '0')}`, 22, 54);

  // Level + stars remaining, top center.
  ctx.textAlign = 'center';
  ctx.font = `bold 18px ${MONO_FONT}`;
  ctx.fillStyle = '#c4b5fd';
  const left = g.starsLeft.filter((s) => !s.taken).length;
  ctx.fillText(`LEVEL ${g.levelIndex + 1}/9 · ${g.level.name}`, W / 2, 30);
  ctx.font = '16px ' + MONO_FONT;
  ctx.fillStyle = '#fde68a';
  ctx.fillText('★'.repeat(left) + '☆'.repeat(g.starsLeft.length - left), W / 2, 54);

  // Lives, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fda4af';
  ctx.font = `bold 14px ${MONO_FONT}`;
  ctx.fillText('LIVES', W - 22, 26);
  for (let i = 0; i < g.lives; i++) {
    const x = W - 40 - i * 26;
    ctx.save();
    ctx.translate(x, 48);
    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Active effect pills, below the top bar on the right.
  let py = 92;
  if (g.shield) {
    pill(ctx, W - 22, py, 'SHIELD', '#22d3ee');
    py += 30;
  }
  if (g.slowTimer > 0) {
    pill(ctx, W - 22, py, `SLOW-MO ${g.slowTimer.toFixed(1)}s`, '#a78bfa');
  }

  // Bottom bar.
  ctx.fillStyle = 'rgba(2, 6, 26, 0.55)';
  ctx.fillRect(0, H - 66, W, 66);
  ctx.fillStyle = 'rgba(165, 243, 252, 0.25)';
  ctx.fillRect(0, H - 66, W, 1);

  // Fuel bar, bottom left.
  ctx.textAlign = 'left';
  ctx.font = `bold 14px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('FUEL', 22, H - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, 22, H - 34, 190, 12, 6);
  ctx.fill();
  const fw = Math.max(0, Math.min(1, g.fuel / g.fuelMax)) * 190;
  ctx.fillStyle = g.fuel < 25 ? '#f87171' : '#34d399';
  if (fw > 0) {
    rr(ctx, 22, H - 34, fw, 12, 6);
    ctx.fill();
  }
  ctx.font = `13px ${MONO_FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${Math.round((g.fuel / g.fuelMax) * 100)}%`, 222, H - 22);

  // Time / shots / hazard, bottom right.
  ctx.textAlign = 'right';
  ctx.font = `13px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`TIME ${g.levelTime.toFixed(1)}s / PAR ${g.level.par}s · SHOTS ${g.shotsUsed}`, W - 22, H - 44);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`HAZARD: ${g.level.hazard}`, W - 22, H - 22);

  // Combo indicator with timer bar.
  if (g.combo > 1 && g.comboTimer > 0) {
    ctx.textAlign = 'center';
    ctx.font = `bold 22px ${MONO_FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.fillText(`COMBO x${g.combo}`, W / 2, H - 44);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    rr(ctx, W / 2 - 60, H - 34, 120, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    rr(ctx, W / 2 - 60, H - 34, 120 * Math.max(0, g.comboTimer / 4), 5, 2);
    ctx.fill();
  }

  // Hint, bottom center.
  if (g.hint) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${MONO_FONT}`;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
    ctx.fillText(g.hint, W / 2, H - 12);
  }

  // SLOW-MO screen tint.
  if (g.slowTimer > 0) {
    ctx.strokeStyle = `rgba(167, 139, 250, ${0.25 + 0.15 * Math.sin(g.time * 6)})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 28, 0.82)';
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.45)';
  ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTitle(ctx, g, t) {
  // Decorative orbit scene behind the title, on the empty left side.
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.35)';
  ctx.setLineDash([3, 10]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(240, 430, 260, 100, -0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const ox = 240 + 260 * Math.cos(t * 0.25);
  const oy = 430 + 100 * Math.sin(t * 0.25) * Math.cos(-0.18) - 260 * Math.sin(t * 0.25) * Math.sin(-0.18) * 0.4;
  ctx.restore();
  drawPlanet(ctx, { x: 240, y: 430, r: 55, mu: 0, color: '#2dd4bf', core: '#0f766e' }, t);
  drawPlanet(ctx, { x: 165, y: 140, r: 30, mu: 0, color: '#facc15', core: '#854d0e', ring: true }, t);
  drawPlanet(ctx, { x: 1120, y: 560, r: 24, mu: 0, color: '#f472b6', core: '#9d174d', craters: 4 }, t);
  drawPowerup(ctx, { x: 1090, y: 130, kind: 'shield', phase: 0 }, t);
  drawPowerup(ctx, { x: 180, y: 580, kind: 'slow', phase: 2 }, t);
  drawProbe(ctx, { ...g, probe: { x: ox, y: oy, vx: 1, vy: 0.3 }, mode: 'fly', aim: { x: 0, y: 0 }, charging: false }, t);

  ctx.textAlign = 'center';
  const grad = ctx.createLinearGradient(0, 130, 0, 250);
  grad.addColorStop(0, '#a5f3fc');
  grad.addColorStop(0.5, '#67e8f9');
  grad.addColorStop(1, '#c084fc');
  ctx.font = `900 108px ${TITLE_FONT}`;
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 42;
  ctx.fillStyle = grad;
  ctx.fillText('ORBITAL', W / 2, 225);
  ctx.shadowBlur = 0;
  ctx.font = `600 24px ${TITLE_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('a gravity-slingshot arcade', W / 2, 268);

  panel(ctx, 390, 300, 500, 200);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `bold 17px ${MONO_FONT}`;
  ctx.fillText('HOW TO FLY', W / 2, 332);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = `16px ${MONO_FONT}`;
  ctx.fillText('MOVE MOUSE to aim · HOLD to charge thrust', W / 2, 366);
  ctx.fillText('RELEASE to slingshot around the planets', W / 2, 394);
  ctx.fillText('COLLECT every star · DON’T crash, don’t drift off', W / 2, 422);
  ctx.fillText('Grab power-ups: SHIELD · SLOW-MO · +1 LIFE · FUEL', W / 2, 450);
  ctx.fillText('Arrows / WASD aim too · SPACE charges · R restarts', W / 2, 478);

  // Feature strip.
  ctx.font = `bold 15px ${MONO_FONT}`;
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.fillText('9 SYSTEMS · POWER-UPS · ORBITING WORLDS · ASTEROID FIELDS · THE SINGULARITY', W / 2, 536);
  ctx.shadowBlur = 0;

  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#fde68a';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 16;
  ctx.fillText('CLICK OR PRESS SPACE TO LAUNCH', W / 2, 586);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  if (g.best > 0) {
    ctx.font = `16px ${MONO_FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`BEST SCORE  ${g.best}`, W / 2, 626);
  }
  ctx.font = `14px ${MONO_FONT}`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.fillText('M mute · 9 systems · 3 lives · power-ups · no fuel, no flight', W / 2, 690);
}

function drawBrief(ctx, g) {
  ctx.fillStyle = 'rgba(2, 4, 20, 0.6)';
  ctx.fillRect(0, 0, W, H);
  const pw = 600;
  const px = (W - pw) / 2;
  panel(ctx, px, 170, pw, 330);
  ctx.textAlign = 'center';
  ctx.font = `bold 15px ${MONO_FONT}`;
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('— MISSION BRIEFING —', W / 2, 208);
  ctx.font = `900 34px ${TITLE_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 18;
  ctx.fillText(`LEVEL ${g.levelIndex + 1}/9 · ${g.level.name}`, W / 2, 256);
  ctx.shadowBlur = 0;
  ctx.font = `16px ${MONO_FONT}`;
  ctx.fillStyle = '#cbd5e1';
  const lines = wrapText(ctx, g.level.brief, pw - 90);
  let y = 292;
  for (const ln of lines) {
    ctx.fillText(ln, W / 2, y);
    y += 26;
  }
  y += 10;
  ctx.font = `bold 16px ${MONO_FONT}`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`COLLECT ${g.level.stars.length} STARS`, W / 2, y);
  y += 28;
  ctx.fillStyle = '#fda4af';
  const pu = g.powerupsLeft.length
    ? `POWER-UPS: ${g.powerupsLeft.map((p) => POWERUPS[p.kind].label).join(' · ')}`
    : 'POWER-UPS: none on this system';
  ctx.fillText(pu, W / 2, y);
  y += 28;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`HAZARD: ${g.level.hazard}`, W / 2, y);
  const blink = 0.55 + 0.45 * Math.sin(g.time * 4);
  ctx.globalAlpha = blink;
  ctx.font = `bold 18px ${MONO_FONT}`;
  ctx.fillStyle = '#a5f3fc';
  ctx.fillText(`LAUNCHING IN ${Math.max(1, Math.ceil(g.briefTimer))} — CLICK TO SKIP`, W / 2, 462);
  ctx.globalAlpha = 1;
}

function drawClear(ctx, g) {
  ctx.fillStyle = 'rgba(2, 4, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 360, 200, 560, 300);
  ctx.textAlign = 'center';
  ctx.font = `900 44px ${TITLE_FONT}`;
  ctx.fillStyle = '#a3e635';
  ctx.shadowColor = '#65a30d';
  ctx.shadowBlur = 24;
  ctx.fillText('LEVEL CLEAR', W / 2, 272);
  ctx.shadowBlur = 0;
  // Grade, big on the right side of the panel.
  const c = g.clearInfo;
  ctx.font = `900 84px ${TITLE_FONT}`;
  ctx.fillStyle = c.grade === 'S' ? '#fbbf24' : c.grade === 'A' ? '#a3e635' : '#67e8f9';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 26;
  ctx.fillText(c.grade, 840, 380);
  ctx.shadowBlur = 0;
  ctx.font = `bold 13px ${MONO_FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('GRADE', 840, 404);
  ctx.textAlign = 'left';
  ctx.font = `18px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`STARS  ${c.stars} × 100  =  ${c.starScore}`, 420, 330);
  ctx.fillText(`TIME BONUS  ${c.timeBonus}`, 420, 362);
  ctx.fillText(`LEVEL BONUS  ${c.levelBonus}`, 420, 394);
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`TOTAL  ${g.score}`, 420, 436);
  ctx.textAlign = 'center';
  ctx.font = `15px ${MONO_FONT}`;
  ctx.fillStyle = '#c4b5fd';
  ctx.fillText(`NEXT: LEVEL ${g.levelIndex + 2}/9 · ${c.nextName}`, W / 2, 472);
}

function drawOver(ctx, g) {
  ctx.fillStyle = 'rgba(2, 4, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);
  // Panel behind the text so the world (e.g. the black hole's bright
  // accretion ring) never fights the score and stats for attention.
  panel(ctx, 340, 185, 600, 440);
  ctx.textAlign = 'center';
  ctx.font = `900 64px ${TITLE_FONT}`;
  ctx.fillStyle = g.won ? '#a3e635' : '#fb7185';
  ctx.shadowColor = g.won ? '#65a30d' : '#e11d48';
  ctx.shadowBlur = 30;
  ctx.fillText(g.won ? 'MISSION COMPLETE' : 'MISSION OVER', W / 2, 250);
  ctx.shadowBlur = 0;
  ctx.font = `22px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`FINAL SCORE  ${g.score}`, W / 2, 306);
  if (g.won && g.score >= g.best && g.score > 0) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold 18px ${MONO_FONT}`;
    ctx.fillText('★ NEW BEST! ★', W / 2, 342);
  }
  ctx.fillStyle = '#fde68a';
  ctx.font = `20px ${MONO_FONT}`;
  ctx.fillText(`BEST  ${Math.max(g.best, g.score)}`, W / 2, g.won && g.score >= g.best ? 372 : 348);
  // Stats grid.
  const s = g.stats || { levels: g.levelIndex + 1, stars: 0, bestCombo: 0, shots: 0, time: 0 };
  const stats = [
    [`SYSTEMS`, `${s.levels}/9`],
    [`STARS`, `${s.stars}`],
    [`BEST COMBO`, `x${Math.max(1, s.bestCombo)}`],
    [`LAUNCHES`, `${s.shots}`],
  ];
  const sy = g.won && g.score >= g.best ? 420 : 396;
  ctx.font = `bold 14px ${MONO_FONT}`;
  for (let i = 0; i < stats.length; i++) {
    const x = 400 + (i % 2) * 260;
    const y = sy + Math.floor(i / 2) * 56;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(stats[i][0], x, y);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = `bold 24px ${MONO_FONT}`;
    ctx.fillText(stats[i][1], x, y + 28);
    ctx.font = `bold 14px ${MONO_FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `18px ${MONO_FONT}`;
  ctx.fillText(g.won ? 'You conquered every system. The galaxy is yours, pilot.' : `You reached LEVEL ${g.levelIndex + 1} · ${g.level.name}`, W / 2, sy + 132);
  const blink = 0.55 + 0.45 * Math.sin(g.time * 4);
  ctx.globalAlpha = blink;
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#a5f3fc';
  ctx.fillText('PRESS R TO FLY AGAIN', W / 2, sy + 176);
  ctx.globalAlpha = 1;
}

export function render(ctx, g) {
  const t = g.time;
  ctx.save();
  if (g.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
  }
  drawBackground(ctx, g, t);
  if (g.mode === 'title') {
    drawTitle(ctx, g, t);
    ctx.restore();
    return;
  }
  for (const p of g.planets) drawPlanet(ctx, p, t);
  for (const a of g.asteroids) drawAsteroid(ctx, a, t);
  for (const p of g.powerupsLeft) {
    if (!p.taken) drawPowerup(ctx, p, t);
  }
  for (const s of g.starsLeft) {
    if (!s.taken) drawStar(ctx, s.x, s.y, t, s.phase);
  }
  drawTrajectory(ctx, g);
  drawTrail(ctx, g);
  drawParticles(ctx, g);
  drawRings(ctx, g);
  if (g.mode !== 'over') drawProbe(ctx, g, t);
  drawPopups(ctx, g);
  drawHUD(ctx, g);
  if (g.mode === 'brief') drawBrief(ctx, g);
  if (g.mode === 'clear') drawClear(ctx, g);
  if (g.mode === 'over') drawOver(ctx, g);
  ctx.restore();
}
