// ORBITAL staged screenshots: deterministic scenes rendered by the real
// game code behind ?shot=start|play|end&seed=1. Nothing here is a mock
// image — each scene is a real game state, frozen at a fixed clock time,
// so the same URL always renders the same frame.

import { mulberry32, range } from './rng.js';
import { LEVELS } from './levels.js';

// Rebuild the starfield/nebulae deterministically for a seed.
export function seedScenery(g, seed) {
  const rng = mulberry32(seed);
  g.starfield = [];
  for (let i = 0; i < 150; i++) {
    g.starfield.push({
      x: rng() * 1280,
      y: rng() * 720,
      r: range(rng, 0.6, 2.1),
      phase: rng() * Math.PI * 2,
      speed: range(rng, 0.4, 1.6),
      a: range(rng, 0.4, 1),
    });
  }
  const nebColors = [
    'rgba(124, 58, 237, 0.16)',
    'rgba(13, 148, 136, 0.14)',
    'rgba(219, 39, 119, 0.10)',
  ];
  g.nebulae = [];
  for (let i = 0; i < 4; i++) {
    g.nebulae.push({
      x: rng() * 1280,
      y: rng() * 720,
      r: range(rng, 180, 340),
      color: nebColors[i % nebColors.length],
    });
  }
}

// Put the game into a frozen, photogenic state for a screenshot.
// Returns true when a known shot was applied.
export function applyShot(g, name, seed) {
  seedScenery(g, seed);
  // Frozen clock chosen so the blinking prompts ("CLICK OR PRESS SPACE",
  // "PRESS R TO FLY AGAIN") render at full brightness: sin(3.53 * 4) ≈ 1.
  g.time = 3.53;
  g.shake = 0;
  g.trail = [];
  g.particles = [];
  g.popups = [];
  g.charging = false;
  g.power = 0;
  g.hint = '';

  if (name === 'start') {
    g.mode = 'title';
    g.best = 4860;
    g.score = 0;
    return true;
  }

  if (name === 'play') {
    // Level 2, mid-flight: probe slingshotting around the violet planet,
    // trajectory preview curving toward the next star, combo running.
    g.levelIndex = 1;
    g.level = LEVELS[1];
    g.score = 1450;
    g.combo = 3;
    g.comboTimer = 3.2;
    g.lives = 3;
    g.fuel = 68;
    g.fuelMax = 100;
    g.levelTime = 12.4;
    g.starsLeft = g.level.stars.map((s, i) => ({
      x: s.x, y: s.y, taken: i < 2, phase: i * 1.3,
    }));
    g.probe = { x: 660, y: 250, vx: 240, vy: 150 };
    g.aim = { x: 1080, y: 180 };
    g.aimAngle = Math.atan2(180 - 250, 1080 - 660);
    g.mode = 'aim';
    g.charging = true;
    g.power = 0.72;
    // A curved trail behind the probe, as if it just whipped around a planet.
    for (let i = 0; i < 26; i++) {
      const f = i / 26;
      g.trail.push({
        x: 660 - f * 300 + Math.sin(f * 9) * 26,
        y: 250 - f * 170 + f * f * 120,
        life: 0.5 * (1 - f),
        max: 0.5,
        color: '#67e8f9',
        size: 5,
      });
    }
    // Sparkle burst where the last star was collected.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.particles.push({
        x: 430 + Math.cos(a) * 18,
        y: 110 + Math.sin(a) * 18,
        vx: 0, vy: 0,
        life: 0.6, max: 0.6,
        color: i % 2 ? '#fde68a' : '#fbbf24',
        size: 3.5,
      });
    }
    g.popups.push({
      x: 430, y: 84, text: '+300  COMBO x3',
      life: 0.9, max: 0.9, color: '#fbbf24', big: true,
    });
    g.hint = 'RELEASE to slingshot — gravity bends your path';
    return true;
  }

  if (name === 'end') {
    // Game over after a long run: level 4 reached, final score on screen.
    g.levelIndex = 3;
    g.level = LEVELS[3];
    g.score = 4860;
    g.best = 4860;
    g.lives = 0;
    g.fuel = 12;
    g.fuelMax = 120;
    g.starsLeft = g.level.stars.map((s, i) => ({
      x: s.x, y: s.y, taken: i < 4, phase: i * 1.3,
    }));
    g.probe = { x: 640, y: 360, vx: 0, vy: 0 };
    g.aim = { x: 640, y: 200 };
    g.mode = 'over';
    g.won = false;
    g.levelTime = 41.7;
    return true;
  }

  return false;
}
