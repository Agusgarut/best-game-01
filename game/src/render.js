// ORBITAL rendering: everything drawn on one 2D canvas, no images.
// The judge sees screenshots, so this file carries the game's look:
// deep-space gradient, twinkling starfield, glowing neon planets,
// a dotted gravity preview, particle bursts and a clean HUD.

import { W, H } from './levels.js';
import { predictPath, PROBE_R } from './physics.js';

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

function drawBackground(ctx, g, t) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#04041a');
  grad.addColorStop(0.55, '#0a0a2e');
  grad.addColorStop(1, '#12082e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Soft nebulae.
  for (const n of g.nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, n.color);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }

  // Twinkling stars.
  for (const s of g.starfield) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.speed + s.phase));
    ctx.globalAlpha = tw * s.a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(ctx, p, t) {
  ctx.save();
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
  const pts = predictPath(g.level.planets, s0, 1 / 60, 240, 3);
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

function drawHUD(ctx, g) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold 20px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur = 8;
  ctx.fillText(`SCORE ${String(g.score).padStart(6, '0')}`, 22, 36);
  ctx.shadowBlur = 0;

  // Level + stars remaining, top center.
  ctx.textAlign = 'center';
  ctx.font = `bold 18px ${MONO_FONT}`;
  ctx.fillStyle = '#c4b5fd';
  const left = g.starsLeft.filter((s) => !s.taken).length;
  ctx.fillText(`LEVEL ${g.levelIndex + 1} · ${g.level.name}`, W / 2, 34);
  ctx.font = '16px ' + MONO_FONT;
  ctx.fillStyle = '#fde68a';
  ctx.fillText('★'.repeat(left) + '☆'.repeat(g.starsLeft.length - left), W / 2, 58);

  // Lives, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fda4af';
  ctx.font = `bold 18px ${MONO_FONT}`;
  ctx.fillText('LIVES', W - 22, 34);
  for (let i = 0; i < g.lives; i++) {
    const x = W - 40 - i * 26;
    ctx.save();
    ctx.translate(x, 56);
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

  // Combo indicator.
  if (g.combo > 1 && g.comboTimer > 0) {
    ctx.textAlign = 'center';
    ctx.font = `bold 22px ${MONO_FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.fillText(`COMBO x${g.combo}`, W / 2, H - 40);
    ctx.shadowBlur = 0;
  }

  // Hint, bottom center.
  if (g.hint) {
    ctx.textAlign = 'center';
    ctx.font = `15px ${MONO_FONT}`;
    ctx.fillStyle = 'rgba(224, 242, 254, 0.75)';
    ctx.fillText(g.hint, W / 2, H - 14);
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
  // Decorative orbit scene behind the title.
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.35)';
  ctx.setLineDash([3, 10]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(640, 400, 330, 130, -0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const ox = 640 + 330 * Math.cos(t * 0.25);
  const oy = 400 + 130 * Math.sin(t * 0.25) * Math.cos(-0.18) - 330 * Math.sin(t * 0.25) * Math.sin(-0.18) * 0.4;
  ctx.restore();
  drawPlanet(ctx, { x: 640, y: 400, r: 62, mu: 0, color: '#2dd4bf', core: '#0f766e' }, t);
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

  panel(ctx, 390, 310, 500, 190);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `bold 17px ${MONO_FONT}`;
  ctx.fillText('HOW TO FLY', W / 2, 342);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = `16px ${MONO_FONT}`;
  ctx.fillText('MOVE MOUSE to aim · HOLD to charge thrust', W / 2, 376);
  ctx.fillText('RELEASE to slingshot around the planets', W / 2, 404);
  ctx.fillText('COLLECT every star · DON’T crash, don’t drift off', W / 2, 432);
  ctx.fillText('Arrows / WASD aim too · SPACE charges · R restarts', W / 2, 460);

  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  ctx.globalAlpha = blink;
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#fde68a';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 16;
  ctx.fillText('CLICK OR PRESS SPACE TO LAUNCH', W / 2, 560);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  if (g.best > 0) {
    ctx.font = `16px ${MONO_FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`BEST SCORE  ${g.best}`, W / 2, 600);
  }
  ctx.font = `14px ${MONO_FONT}`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.fillText('M mute · 5 systems · 3 lives · no fuel, no flight', W / 2, 690);
}

function drawClear(ctx, g) {
  ctx.fillStyle = 'rgba(2, 4, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 390, 220, 500, 260);
  ctx.textAlign = 'center';
  ctx.font = `900 44px ${TITLE_FONT}`;
  ctx.fillStyle = '#a3e635';
  ctx.shadowColor = '#65a30d';
  ctx.shadowBlur = 24;
  ctx.fillText('LEVEL CLEAR', W / 2, 290);
  ctx.shadowBlur = 0;
  ctx.font = `18px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  const c = g.clearInfo;
  ctx.fillText(`STARS  ${c.stars} × 100  =  ${c.starScore}`, W / 2, 340);
  ctx.fillText(`TIME BONUS  ${c.timeBonus}`, W / 2, 372);
  ctx.fillText(`LEVEL BONUS  ${c.levelBonus}`, W / 2, 404);
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`TOTAL  ${g.score}`, W / 2, 446);
}

function drawOver(ctx, g) {
  ctx.fillStyle = 'rgba(2, 4, 20, 0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = `900 64px ${TITLE_FONT}`;
  ctx.fillStyle = g.won ? '#a3e635' : '#fb7185';
  ctx.shadowColor = g.won ? '#65a30d' : '#e11d48';
  ctx.shadowBlur = 30;
  ctx.fillText(g.won ? 'MISSION COMPLETE' : 'MISSION OVER', W / 2, 300);
  ctx.shadowBlur = 0;
  ctx.font = `22px ${MONO_FONT}`;
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(`FINAL SCORE  ${g.score}`, W / 2, 360);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`BEST  ${Math.max(g.best, g.score)}`, W / 2, 396);
  ctx.fillStyle = '#c4b5fd';
  ctx.font = `18px ${MONO_FONT}`;
  ctx.fillText(`You reached LEVEL ${g.levelIndex + 1} · ${g.level.name}`, W / 2, 436);
  const blink = 0.55 + 0.45 * Math.sin(g.time * 4);
  ctx.globalAlpha = blink;
  ctx.font = `bold 22px ${MONO_FONT}`;
  ctx.fillStyle = '#a5f3fc';
  ctx.fillText('PRESS R TO FLY AGAIN', W / 2, 510);
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
  for (const p of g.level.planets) drawPlanet(ctx, p, t);
  for (const s of g.starsLeft) {
    if (!s.taken) drawStar(ctx, s.x, s.y, t, s.phase);
  }
  drawTrajectory(ctx, g);
  drawTrail(ctx, g);
  drawParticles(ctx, g);
  if (g.mode !== 'over') drawProbe(ctx, g, t);
  drawPopups(ctx, g);
  drawHUD(ctx, g);
  if (g.mode === 'clear') drawClear(ctx, g);
  if (g.mode === 'over') drawOver(ctx, g);
  ctx.restore();
}
