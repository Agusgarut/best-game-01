// ORBITAL — a gravity-slingshot arcade game.
// Slingshot a probe around neon planets, collect every star, don't crash.
// Vanilla JS, canvas 2D, no libraries, no network. Sounds are synthesized.

import { W, H, LEVELS, POWERUPS, instantiateLevel } from './levels.js';
import { mulberry32, range } from './rng.js';
import { stepProbe, PROBE_R, STAR_R, POWERUP_R, updatePlanets, updateAsteroids, asteroidHit } from './physics.js';
import { render } from './render.js';
import { attachInput } from './input.js';
import { sfx, setMuted, isMuted } from './audio.js';
import { seedScenery, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

function loadBest() {
  try {
    return Number(window.localStorage.getItem('orbital-best') || '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    window.localStorage.setItem('orbital-best', String(v));
  } catch {
    /* storage unavailable — best score just isn't kept */
  }
}

function createGame() {
  const g = {
    mode: 'title',
    time: 0,
    score: 0,
    best: loadBest(),
    lives: 3,
    combo: 0,
    comboTimer: 0,
    lastCollect: -99,
    bestCombo: 0,
    starsCollected: 0,
    shotsUsed: 0,
    levelStarScore: 0,
    levelIndex: 0,
    level: LEVELS[0],
    planets: [],
    asteroids: [],
    powerupsLeft: [],
    starsLeft: [],
    probe: { x: 120, y: 620, vx: 0, vy: 0 },
    aim: { x: 640, y: 300 },
    aimAngle: -Math.PI / 2,
    charging: false,
    power: 0,
    fuel: 100,
    fuelMax: 100,
    shield: false,
    slowTimer: 0,
    levelTime: 0,
    trail: [],
    particles: [],
    rings: [],
    popups: [],
    shake: 0,
    hint: '',
    won: false,
    clearInfo: null,
    clearTimer: 0,
    briefTimer: 0,
    stats: null,
    starfield: [],
    starfieldNear: [],
    nebulae: [],
    galaxies: [],
  };
  seedScenery(g, seed);
  return g;
}

const g = createGame();

function loadLevel(i) {
  g.levelIndex = i;
  g.level = LEVELS[i];
  const live = instantiateLevel(g.level);
  g.planets = live.planets;
  g.asteroids = live.asteroids;
  g.powerupsLeft = live.powerups;
  g.starsLeft = g.level.stars.map((s, k) => ({
    x: s.x, y: s.y, taken: false, phase: k * 1.3,
  }));
  g.probe = { x: g.level.start.x, y: g.level.start.y, vx: 0, vy: 0 };
  g.aim = { x: g.level.start.x, y: g.level.start.y - 200 };
  g.aimAngle = -Math.PI / 2;
  g.fuelMax = g.level.fuel;
  g.fuel = g.level.fuel;
  g.levelTime = 0;
  g.combo = 0;
  g.comboTimer = 0;
  g.levelStarScore = 0;
  g.trail = [];
  g.particles = [];
  g.rings = [];
  g.popups = [];
  g.shake = 0;
  g.charging = false;
  g.power = 0;
  g.shield = false;
  g.slowTimer = 0;
  g.won = false;
  g.clearInfo = null;
  g.briefTimer = 3.4;
  g.mode = 'brief';
  g.hint = i === 0
    ? 'MOVE MOUSE to aim · HOLD to charge · RELEASE to launch'
    : `LEVEL ${i + 1} · ${g.level.name} — collect every star`;
}

function burst(x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    g.particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.7 + Math.random() * 0.4, max: 1.1,
      color, size: 2 + Math.random() * 3.5,
    });
  }
}

function ring(x, y, color, max) {
  g.rings.push({ x, y, r: 8, max, life: 0.55, maxLife: 0.55, color });
}

function popup(x, y, text, color, big) {
  g.popups.push({ x, y, text, color, big: !!big, life: 1.1, max: 1.1 });
}

function collectStar(s) {
  s.taken = true;
  g.starsCollected += 1;
  g.combo = g.time - g.lastCollect < 4 ? g.combo + 1 : 1;
  g.lastCollect = g.time;
  g.comboTimer = 4;
  if (g.combo > g.bestCombo) g.bestCombo = g.combo;
  const pts = 100 * g.combo;
  g.score += pts;
  g.levelStarScore += pts;
  g.fuel = Math.min(g.fuelMax, g.fuel + 12);
  burst(s.x, s.y, '#fbbf24', 22, 190);
  ring(s.x, s.y, '#fde68a', 70);
  popup(s.x, s.y - 18, `+${pts}${g.combo > 1 ? `  COMBO x${g.combo}` : ''}`, '#fde68a', g.combo > 2);
  sfx.collect(g.combo);
  if (g.starsLeft.every((st) => st.taken)) {
    const timeBonus = Math.max(0, Math.round((g.level.par - g.levelTime) * 10));
    const levelBonus = 250 * (g.levelIndex + 1);
    g.score += timeBonus + levelBonus;
    const grade = g.levelTime < g.level.par * 0.6 ? 'S' : g.levelTime < g.level.par ? 'A' : 'B';
    g.clearInfo = {
      stars: g.starsLeft.length,
      starScore: g.levelStarScore,
      timeBonus,
      levelBonus,
      grade,
      nextName: g.levelIndex + 1 < LEVELS.length ? LEVELS[g.levelIndex + 1].name : '—',
    };
    g.mode = 'clear';
    g.clearTimer = 2.6;
    sfx.clear();
  }
}

function collectPowerup(p) {
  p.taken = true;
  g.score += 150;
  const def = POWERUPS[p.kind];
  burst(p.x, p.y, def.color, 26, 210);
  ring(p.x, p.y, def.color, 90);
  if (p.kind === 'shield') {
    g.shield = true;
    popup(p.x, p.y - 20, '+150  SHIELD ONLINE', def.color, true);
    sfx.power();
  } else if (p.kind === 'slow') {
    g.slowTimer = 6;
    popup(p.x, p.y - 20, '+150  SLOW-MO 6s', def.color, true);
    sfx.power();
  } else if (p.kind === 'life') {
    g.lives = Math.min(5, g.lives + 1);
    popup(p.x, p.y - 20, '+150  +1 LIFE', def.color, true);
    sfx.power();
  } else {
    g.fuel = g.fuelMax;
    popup(p.x, p.y - 20, '+150  FUEL FULL', def.color, true);
    sfx.power();
  }
}

// A shield absorbs one crash: the probe bounces off the body instead.
function shieldBounce(cx, cy, r) {
  const dx = g.probe.x - cx;
  const dy = g.probe.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  const dot = g.probe.vx * nx + g.probe.vy * ny;
  g.probe.vx = (g.probe.vx - 2 * dot * nx) * 0.6;
  g.probe.vy = (g.probe.vy - 2 * dot * ny) * 0.6;
  g.probe.x = cx + nx * (r + PROBE_R + 3);
  g.probe.y = cy + ny * (r + PROBE_R + 3);
  g.shield = false;
  g.shake = 10;
  burst(g.probe.x, g.probe.y, '#22d3ee', 26, 220);
  ring(g.probe.x, g.probe.y, '#22d3ee', 100);
  popup(g.probe.x, g.probe.y - 26, 'SHIELD SAVED YOU', '#67e8f9', true);
  sfx.shield();
}

function loseProbe(reason) {
  burst(g.probe.x, g.probe.y, '#fb7185', 34, 260);
  burst(g.probe.x, g.probe.y, '#fde68a', 16, 160);
  ring(g.probe.x, g.probe.y, '#fb7185', 120);
  g.shake = 14;
  g.lives -= 1;
  sfx.crash();
  if (g.lives <= 0) {
    endGame(false);
    return;
  }
  popup(g.probe.x, g.probe.y - 24, reason, '#fda4af', true);
  g.probe = { x: g.level.start.x, y: g.level.start.y, vx: 0, vy: 0 };
  g.aim = { x: g.level.start.x, y: g.level.start.y - 200 };
  g.aimAngle = -Math.PI / 2;
  g.fuel = g.fuelMax;
  g.trail = [];
  g.mode = 'aim';
  g.hint = 'Probe lost — fly again, pilot';
}

function endGame(won) {
  g.won = won;
  g.mode = 'over';
  g.stats = {
    levels: won ? LEVELS.length : g.levelIndex + 1,
    stars: g.starsCollected,
    bestCombo: g.bestCombo,
    shots: g.shotsUsed,
    time: Math.round(g.time),
  };
  if (g.score > g.best) {
    g.best = g.score;
    saveBest(g.best);
  }
  if (won) sfx.clear();
  else sfx.over();
}

function launch() {
  if (g.mode !== 'aim') return;
  const dx = g.aim.x - g.probe.x;
  const dy = g.aim.y - g.probe.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return;
  const cost = 12 + 18 * g.power;
  if (g.fuel < cost) {
    g.hint = 'FUEL LOW — wait for it to recharge';
    return;
  }
  g.fuel -= cost;
  g.shotsUsed += 1;
  const speed = 80 + 460 * g.power;
  g.probe.vx = (dx / d) * speed;
  g.probe.vy = (dy / d) * speed;
  g.mode = 'fly';
  g.hint = '';
  burst(g.probe.x, g.probe.y, '#67e8f9', 10, 120);
  sfx.launch();
}

function dismissBrief() {
  if (g.mode !== 'brief') return;
  g.briefTimer = 0;
  g.mode = 'aim';
  sfx.click();
}

function startGame() {
  g.score = 0;
  g.lives = 3;
  g.best = loadBest();
  g.bestCombo = 0;
  g.starsCollected = 0;
  g.shotsUsed = 0;
  g.stats = null;
  loadLevel(0);
  sfx.click();
}

function skipClear() {
  g.clearTimer = 0;
  advanceLevel();
}

function advanceLevel() {
  if (g.levelIndex + 1 >= LEVELS.length) {
    endGame(true);
    return;
  }
  loadLevel(g.levelIndex + 1);
}

function update(dt) {
  g.time += dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 26);
  if (g.slowTimer > 0) g.slowTimer = Math.max(0, g.slowTimer - dt);

  // Particles, trail, rings, popups always age.
  for (const p of g.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const t of g.trail) t.life -= dt;
  g.trail = g.trail.filter((t) => t.life > 0);
  for (const r of g.rings) {
    r.life -= dt;
    r.r += (r.max - r.r) * dt * 9;
  }
  g.rings = g.rings.filter((r) => r.life > 0);
  for (const pp of g.popups) pp.life -= dt;
  g.popups = g.popups.filter((pp) => pp.life > 0);
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) g.combo = 0;
  }

  // The world keeps moving on every screen except title.
  if (g.mode !== 'title') {
    updatePlanets(g.planets, g.time);
    updateAsteroids(g.asteroids, dt, W, H);
  }

  if (g.mode === 'brief') {
    g.briefTimer -= dt;
    if (g.briefTimer <= 0) g.mode = 'aim';
    return;
  }

  if (g.mode === 'aim') {
    g.levelTime += dt;
    g.fuel = Math.min(g.fuelMax, g.fuel + 6 * dt);
    if (g.charging) g.power = Math.min(1, g.power + dt * 1.4);
    return;
  }

  if (g.mode === 'fly') {
    g.levelTime += dt;
    // SLOW-MO stretches physics time; the level clock keeps real time.
    const fdt = dt * (g.slowTimer > 0 ? 0.45 : 1);
    // 4 substeps keep fast slingshots stable near planets.
    const sub = 4;
    const sdt = fdt / sub;
    for (let i = 0; i < sub; i++) {
      g.probe = stepProbe(g.planets, g.probe, sdt);
      // Star collection.
      for (const s of g.starsLeft) {
        if (!s.taken && Math.hypot(g.probe.x - s.x, g.probe.y - s.y) < STAR_R) {
          collectStar(s);
          if (g.mode !== 'fly') return;
        }
      }
      // Power-up collection.
      for (const p of g.powerupsLeft) {
        if (!p.taken && Math.hypot(g.probe.x - p.x, g.probe.y - p.y) < POWERUP_R) {
          collectPowerup(p);
        }
      }
      // Planet impact.
      for (const p of g.planets) {
        if (Math.hypot(g.probe.x - p.x, g.probe.y - p.y) < p.r + PROBE_R - 2) {
          if (g.shield) {
            shieldBounce(p.x, p.y, p.r);
          } else {
            loseProbe('CRASHED!');
          }
          return;
        }
      }
      // Asteroid impact.
      const a = asteroidHit(g.asteroids, g.probe.x, g.probe.y);
      if (a) {
        if (g.shield) {
          shieldBounce(a.x, a.y, a.r);
        } else {
          loseProbe('HIT AN ASTEROID!');
        }
        return;
      }
      // Drifted off-screen.
      if (g.probe.x < -90 || g.probe.x > W + 90 || g.probe.y < -90 || g.probe.y > H + 90) {
        loseProbe('LOST IN DEEP SPACE');
        return;
      }
    }
    // Thruster trail + exhaust sparks.
    g.trail.push({
      x: g.probe.x, y: g.probe.y,
      life: 0.45, max: 0.45,
      color: '#67e8f9', size: 4,
    });
    g.particles.push({
      x: g.probe.x - g.probe.vx * 0.02 + (Math.random() - 0.5) * 8,
      y: g.probe.y - g.probe.vy * 0.02 + (Math.random() - 0.5) * 8,
      vx: -g.probe.vx * 0.08, vy: -g.probe.vy * 0.08,
      life: 0.35, max: 0.35,
      color: Math.random() < 0.5 ? '#67e8f9' : '#fbbf24',
      size: 2 + Math.random() * 2,
    });
    return;
  }

  if (g.mode === 'clear') {
    g.clearTimer -= dt;
    if (g.clearTimer <= 0) advanceLevel();
  }
}

const actions = {
  start: startGame,
  launch,
  restart: startGame,
  toggleMute: () => setMuted(!isMuted()),
  skipClear,
  dismissBrief,
};

attachInput(canvas, g, actions);

// --- Shot mode: one deterministic frame, no loop, no audio. ---
if (shotName && applyShot(g, shotName, seed)) {
  render(ctx, g);
  document.title = 'shot-ready';
} else {
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    update(dt);
    render(ctx, g);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Expose a little state for debugging in the console.
window.ORBITAL = { game: g };
