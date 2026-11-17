// ORBITAL staged screenshots: deterministic scenes rendered by the real
// game code behind ?shot=start|play|power|end&seed=1. Nothing here is a mock
// image — each scene is a real game state, frozen at a fixed clock time,
// so the same URL always renders the same frame.

import { mulberry32, range } from './rng.js';
import { LEVELS, instantiateLevel } from './levels.js';

// Rebuild the scenery deterministically for a seed.
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
  // Near stars: bigger, brighter, some with cross sparkles.
  g.starfieldNear = [];
  for (let i = 0; i < 42; i++) {
    g.starfieldNear.push({
      x: rng() * 1280,
      y: rng() * 720,
      r: range(rng, 1.6, 3.2),
      phase: rng() * Math.PI * 2,
      speed: range(rng, 0.3, 1.1),
      a: range(rng, 0.55, 1),
    });
  }
  const nebColors = [
    'rgba(124, 58, 237, 0.20)',
    'rgba(13, 148, 136, 0.18)',
    'rgba(219, 39, 119, 0.14)',
    'rgba(249, 115, 22, 0.10)',
    'rgba(59, 130, 246, 0.13)',
    'rgba(34, 197, 94, 0.09)',
  ];
  g.nebulae = [];
  for (let i = 0; i < 6; i++) {
    g.nebulae.push({
      x: rng() * 1280,
      y: rng() * 720,
      r: range(rng, 200, 380),
      color: nebColors[i % nebColors.length],
    });
  }
  // Distant galaxies.
  const galColors = [
    'rgba(167, 139, 250, 0.55)',
    'rgba(45, 212, 191, 0.5)',
    'rgba(244, 114, 182, 0.5)',
    'rgba(96, 165, 250, 0.45)',
  ];
  g.galaxies = [];
  for (let i = 0; i < 4; i++) {
    g.galaxies.push({
      x: 120 + rng() * 1040,
      y: 90 + rng() * 540,
      r: range(rng, 14, 30),
      rot: rng() * Math.PI,
      color: galColors[i % galColors.length],
    });
  }
}

function setupLevel(g, i) {
  g.levelIndex = i;
  g.level = LEVELS[i];
  const live = instantiateLevel(g.level);
  g.planets = live.planets;
  g.asteroids = live.asteroids;
  g.powerupsLeft = live.powerups;
  g.starsLeft = g.level.stars.map((s, k) => ({
    x: s.x, y: s.y, taken: false, phase: k * 1.3,
  }));
  g.fuelMax = g.level.fuel;
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
  g.rings = [];
  g.popups = [];
  g.charging = false;
  g.power = 0;
  g.shield = false;
  g.slowTimer = 0;
  g.hint = '';

  if (name === 'start') {
    g.mode = 'title';
    g.best = 4860;
    g.score = 0;
    return true;
  }

  if (name === 'play') {
    // Level 6 ASTEROID BELT, mid-flight: probe slingshotting past the
    // orbiting teal planet, trajectory curving toward the next star,
    // asteroids drifting, shield power-up on screen, combo running.
    setupLevel(g, 5);
    g.score = 2840;
    g.combo = 4;
    g.comboTimer = 3.2;
    g.bestCombo = 4;
    g.lives = 3;
    g.fuel = 74;
    g.levelTime = 18.6;
    g.shotsUsed = 5;
    g.starsLeft.forEach((s, i) => { s.taken = i < 2; });
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
        x: 520 + Math.cos(a) * 18,
        y: 120 + Math.sin(a) * 18,
        vx: 0, vy: 0,
        life: 0.6, max: 0.6,
        color: i % 2 ? '#fde68a' : '#fbbf24',
        size: 3.5,
      });
    }
    g.popups.push({
      x: 520, y: 94, text: '+400  COMBO x4',
      life: 0.9, max: 0.9, color: '#fbbf24', big: true,
    });
    g.hint = 'RELEASE to slingshot — gravity bends your path';
    return true;
  }

  if (name === 'power') {
    // Level 8 GRAVITY WELL: the probe just grabbed the SHIELD power-up
    // while SLOW-MO is running — burst, shockwave ring and badge on screen.
    setupLevel(g, 7);
    g.score = 5210;
    g.combo = 2;
    g.comboTimer = 2.6;
    g.bestCombo = 5;
    g.lives = 2;
    g.fuel = 45;
    g.levelTime = 34.2;
    g.shotsUsed = 9;
    g.starsLeft.forEach((s, i) => { s.taken = i < 3; });
    g.powerupsLeft.forEach((p) => { p.taken = p.kind === 'shield'; });
    g.shield = true;
    g.slowTimer = 3.4;
    g.probe = { x: 700, y: 300, vx: 180, vy: -90 };
    g.aim = { x: 1080, y: 360 };
    g.aimAngle = Math.atan2(360 - 300, 1080 - 700);
    g.mode = 'aim';
    g.charging = true;
    g.power = 0.5;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      g.particles.push({
        x: 700 + Math.cos(a) * (14 + (i % 3) * 10),
        y: 300 + Math.sin(a) * (14 + (i % 3) * 10),
        vx: 0, vy: 0,
        life: 0.7, max: 0.7,
        color: i % 2 ? '#22d3ee' : '#a5f3fc',
        size: 3.5,
      });
    }
    g.rings.push({ x: 700, y: 300, r: 30, max: 110, life: 0.5, maxLife: 0.5, color: '#22d3ee' });
    g.popups.push({
      x: 700, y: 252, text: 'SHIELD ONLINE',
      life: 0.9, max: 0.9, color: '#67e8f9', big: true,
    });
    for (let i = 0; i < 18; i++) {
      const f = i / 18;
      g.trail.push({
        x: 700 - f * 260 + Math.sin(f * 8) * 20,
        y: 300 - f * 140 + f * f * 90,
        life: 0.5 * (1 - f),
        max: 0.5,
        color: '#a78bfa',
        size: 5,
      });
    }
    g.hint = 'SHIELD eats one crash · SLOW-MO is running';
    return true;
  }

  if (name === 'end') {
    // Victory after conquering all nine systems: MISSION COMPLETE,
    // final score, stats grid, NEW BEST tag.
    setupLevel(g, 8);
    g.score = 12480;
    g.best = 12480;
    g.lives = 3;
    g.fuel = 60;
    g.levelTime = 88.4;
    g.shotsUsed = 21;
    g.bestCombo = 6;
    g.starsLeft.forEach((s) => { s.taken = true; });
    g.probe = { x: 640, y: 360, vx: 0, vy: 0 };
    g.aim = { x: 640, y: 200 };
    g.mode = 'over';
    g.won = true;
    g.stats = { levels: 9, stars: 52, bestCombo: 6, shots: 21, time: 412 };
    return true;
  }

  return false;
}
