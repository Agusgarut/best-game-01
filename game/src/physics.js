// ORBITAL physics: gravity, probe motion, trajectory preview, collisions,
// orbiting planets and drifting asteroids.
// Pure functions over plain state — no DOM, no canvas — so the trajectory
// preview simulates exactly the same rules the live game plays by.

export const PROBE_R = 9;
export const STAR_R = 26; // collect radius (the drawn star is smaller)
export const POWERUP_R = 28; // collect radius for power-ups
export const MAX_SPEED = 900;

// One gravity step for a point mass. planets: [{x,y,r,mu}].
// Returns acceleration {ax, ay} at position (x, y).
export function gravityAt(planets, x, y) {
  let ax = 0;
  let ay = 0;
  for (const p of planets) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 0.001;
    // Clamp the distance so the force stays finite near a planet's core.
    const dc = Math.max(d, p.r * 0.55);
    const a = p.mu / (dc * dc);
    ax += (a * dx) / d;
    ay += (a * dy) / d;
  }
  return { ax, ay };
}

// Advance a probe state by dt seconds (semi-implicit Euler, one substep).
// state: { x, y, vx, vy }. Returns a fresh state object.
export function stepProbe(planets, s, dt) {
  const { ax, ay } = gravityAt(planets, s.x, s.y);
  let vx = s.vx + ax * dt;
  let vy = s.vy + ay * dt;
  const sp = Math.hypot(vx, vy);
  if (sp > MAX_SPEED) {
    vx = (vx / sp) * MAX_SPEED;
    vy = (vy / sp) * MAX_SPEED;
  }
  return { x: s.x + vx * dt, y: s.y + vy * dt, vx, vy };
}

// Simulate the flight path from a probe state, for the dotted preview.
// Stops early on planet impact or after maxSteps. Returns [{x,y}, ...]
// sampled every `stride` steps.
export function predictPath(planets, s, dt, maxSteps, stride) {
  const pts = [];
  let cur = { x: s.x, y: s.y, vx: s.vx, vy: s.vy };
  for (let i = 0; i < maxSteps; i++) {
    cur = stepProbe(planets, cur, dt);
    let hit = false;
    for (const p of planets) {
      if (Math.hypot(cur.x - p.x, cur.y - p.y) < p.r + PROBE_R * 0.5) {
        hit = true;
        break;
      }
    }
    if (i % stride === 0) pts.push({ x: cur.x, y: cur.y });
    if (hit) break;
  }
  return pts;
}

// First planet the probe would hit along its path, or null.
export function firstImpact(planets, s, dt, maxSteps) {
  let cur = { x: s.x, y: s.y, vx: s.vx, vy: s.vy };
  for (let i = 0; i < maxSteps; i++) {
    cur = stepProbe(planets, cur, dt);
    for (const p of planets) {
      if (Math.hypot(cur.x - p.x, cur.y - p.y) < p.r + PROBE_R) return p;
    }
  }
  return null;
}

// Move orbiting planets to their positions at level time t (seconds).
// Planets without an orbit stay put. Mutates the live planet copies.
export function updatePlanets(planets, t) {
  for (const p of planets) {
    if (!p.orbit) continue;
    const o = p.orbit;
    const a = o.phase + t * o.speed;
    p.x = o.cx + Math.cos(a) * o.r;
    p.y = o.cy + Math.sin(a) * o.r;
  }
}

// Drift asteroids and wrap them around the playfield edges.
export function updateAsteroids(asteroids, dt, W, H) {
  for (const a of asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotSpeed * dt;
    const m = a.r + 30;
    if (a.x < -m) a.x += W + m * 2;
    if (a.x > W + m) a.x -= W + m * 2;
    if (a.y < -m) a.y += H + m * 2;
    if (a.y > H + m) a.y -= H + m * 2;
  }
}

// First asteroid the probe overlaps, or null.
export function asteroidHit(asteroids, x, y) {
  for (const a of asteroids) {
    if (Math.hypot(x - a.x, y - a.y) < a.r + PROBE_R - 2) return a;
  }
  return null;
}
