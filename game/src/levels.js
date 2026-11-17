// ORBITAL level data: 9 handcrafted star systems.
import { mulberry32 } from './rng.js';
// Coordinates are in the game's logical 1280x720 space.
// planet: { x, y, r, mu, color, core, ring?, banded?, craters?, hole?, orbit? }
//   mu is the gravity strength (G*m). orbit: { cx, cy, r, speed, phase } —
//   the planet circles (cx, cy); x/y in the def are its position at t=0.
// star: { x, y } — collectible stars. start: { x, y } — launch pad.
// powerup: { x, y, kind } — 'shield' | 'slow' | 'life' | 'fuel'.
// asteroid: { x, y, r, vx, vy, seed } — drifting hazards, they wrap.
// par: seconds for the time bonus. fuel: starting fuel for the level.
// brief: mission briefing shown before the level. hazard: short label.
export const W = 1280;
export const H = 720;

export const POWERUPS = {
  shield: { color: '#22d3ee', label: 'SHIELD' },
  slow: { color: '#a78bfa', label: 'SLOW-MO' },
  life: { color: '#fb7185', label: '+1 LIFE' },
  fuel: { color: '#34d399', label: 'FUEL' },
};

export const LEVELS = [
  {
    name: 'FIRST LIGHT',
    par: 45,
    fuel: 100,
    start: { x: 120, y: 620 },
    brief: 'Learn the ropes: one gentle world, three stars.',
    hazard: 'CALM SPACE',
    planets: [
      { x: 640, y: 380, r: 55, mu: 30000, color: '#2dd4bf', core: '#0f766e', craters: 5 },
    ],
    stars: [
      { x: 640, y: 170 },
      { x: 1050, y: 500 },
      { x: 360, y: 560 },
    ],
    powerups: [],
    asteroids: [],
  },
  {
    name: 'TWIN SUNS',
    par: 60,
    fuel: 100,
    start: { x: 110, y: 120 },
    brief: 'Two suns, five stars. Chain pickups fast for combos.',
    hazard: 'DUAL GRAVITY',
    planets: [
      { x: 430, y: 300, r: 48, mu: 26000, color: '#fb923c', core: '#9a3412', banded: true },
      { x: 880, y: 430, r: 52, mu: 30000, color: '#a78bfa', core: '#5b21b6', craters: 6 },
    ],
    stars: [
      { x: 430, y: 110 },
      { x: 1090, y: 180 },
      { x: 640, y: 580 },
      { x: 1150, y: 300 },
      { x: 190, y: 320 },
    ],
    powerups: [],
    asteroids: [],
  },
  {
    name: 'THE GAUNTLET',
    par: 75,
    fuel: 110,
    start: { x: 120, y: 620 },
    brief: 'Three worlds in a row. Mind the crossfire.',
    hazard: 'TRIPLE PULL',
    planets: [
      { x: 400, y: 200, r: 45, mu: 24000, color: '#f472b6', core: '#9d174d', craters: 4 },
      { x: 880, y: 240, r: 50, mu: 28000, color: '#38bdf8', core: '#075985', banded: true },
      { x: 640, y: 520, r: 60, mu: 34000, color: '#a3e635', core: '#3f6212', ring: true },
    ],
    stars: [
      { x: 640, y: 90 },
      { x: 1150, y: 600 },
      { x: 400, y: 420 },
      { x: 950, y: 640 },
      { x: 180, y: 300 },
      { x: 1080, y: 620 },
    ],
    powerups: [],
    asteroids: [],
  },
  {
    name: 'CROSSWINDS',
    par: 90,
    fuel: 120,
    start: { x: 640, y: 650 },
    brief: 'Four planets pull in every direction. Fuel is generous — use it.',
    hazard: 'CROSS PULL',
    planets: [
      { x: 330, y: 220, r: 46, mu: 26000, color: '#facc15', core: '#854d0e', banded: true },
      { x: 950, y: 200, r: 46, mu: 26000, color: '#2dd4bf', core: '#0f766e', craters: 5 },
      { x: 330, y: 520, r: 50, mu: 30000, color: '#a78bfa', core: '#5b21b6', craters: 6 },
      { x: 950, y: 520, r: 50, mu: 30000, color: '#fb7185', core: '#881337', ring: true },
    ],
    stars: [
      { x: 640, y: 120 },
      { x: 640, y: 360 },
      { x: 120, y: 120 },
      { x: 1160, y: 120 },
      { x: 640, y: 600 },
      { x: 480, y: 480 },
      { x: 800, y: 480 },
    ],
    powerups: [{ x: 640, y: 240, kind: 'fuel' }],
    asteroids: [],
  },
  {
    name: 'EVENT HORIZON',
    par: 110,
    fuel: 130,
    start: { x: 120, y: 100 },
    brief: 'A giant world dominates the system. Respect its gravity.',
    hazard: 'HEAVY WORLD',
    planets: [
      { x: 640, y: 360, r: 82, mu: 62000, color: '#e879f9', core: '#701a75', banded: true },
      { x: 300, y: 560, r: 44, mu: 24000, color: '#38bdf8', core: '#075985', craters: 5 },
      { x: 1000, y: 150, r: 44, mu: 24000, color: '#facc15', core: '#854d0e', craters: 4 },
      { x: 1020, y: 580, r: 48, mu: 28000, color: '#2dd4bf', core: '#0f766e', ring: true },
    ],
    stars: [
      { x: 640, y: 130 },
      { x: 300, y: 360 },
      { x: 980, y: 360 },
      { x: 480, y: 620 },
      { x: 820, y: 620 },
      { x: 120, y: 420 },
      { x: 1160, y: 420 },
    ],
    powerups: [{ x: 640, y: 480, kind: 'shield' }],
    asteroids: [],
  },
  {
    name: 'ASTEROID BELT',
    par: 90,
    fuel: 120,
    start: { x: 120, y: 620 },
    brief: 'NEW: rocks drift through the lanes. Grab the SHIELD — it eats one crash.',
    hazard: 'ASTEROID FIELD',
    planets: [
      { x: 610, y: 330, r: 52, mu: 30000, color: '#2dd4bf', core: '#0f766e', craters: 6, orbit: { cx: 520, cy: 330, r: 90, speed: 0.08, phase: 0 } },
      { x: 940, y: 420, r: 46, mu: 26000, color: '#a78bfa', core: '#5b21b6', banded: true },
    ],
    stars: [
      { x: 520, y: 120 },
      { x: 1100, y: 200 },
      { x: 1100, y: 550 },
      { x: 300, y: 250 },
      { x: 640, y: 600 },
    ],
    powerups: [{ x: 880, y: 150, kind: 'shield' }],
    asteroids: [
      { x: 700, y: 180, r: 16, vx: 12, vy: 8, seed: 11 },
      { x: 350, y: 480, r: 14, vx: -10, vy: 6, seed: 23 },
      { x: 1050, y: 250, r: 18, vx: 8, vy: -10, seed: 37 },
    ],
  },
  {
    name: 'THE DRIFTERS',
    par: 100,
    fuel: 120,
    start: { x: 120, y: 100 },
    brief: 'NEW: the planets themselves are moving. Time your launch.',
    hazard: 'MOVING WORLDS',
    planets: [
      { x: 525, y: 417, r: 48, mu: 28000, color: '#fb923c', core: '#9a3412', banded: true, orbit: { cx: 420, cy: 360, r: 120, speed: 0.06, phase: 0.5 } },
      { x: 835, y: 449, r: 48, mu: 28000, color: '#38bdf8', core: '#075985', craters: 5, orbit: { cx: 900, cy: 360, r: 110, speed: -0.07, phase: 2.2 } },
    ],
    stars: [
      { x: 640, y: 90 },
      { x: 200, y: 360 },
      { x: 1080, y: 360 },
      { x: 640, y: 620 },
      { x: 420, y: 600 },
      { x: 900, y: 120 },
    ],
    powerups: [
      { x: 640, y: 360, kind: 'slow' },
      { x: 1080, y: 620, kind: 'fuel' },
    ],
    asteroids: [
      { x: 300, y: 200, r: 15, vx: 10, vy: -7, seed: 41 },
      { x: 980, y: 200, r: 17, vx: -9, vy: 8, seed: 53 },
      { x: 640, y: 480, r: 13, vx: 11, vy: 5, seed: 67 },
      { x: 200, y: 560, r: 16, vx: -8, vy: -9, seed: 71 },
    ],
  },
  {
    name: 'GRAVITY WELL',
    par: 110,
    fuel: 130,
    start: { x: 640, y: 650 },
    brief: 'A heavy core bends every shot. SLOW-MO helps thread the gap.',
    hazard: 'HEAVY GRAVITY',
    planets: [
      { x: 640, y: 360, r: 64, mu: 52000, color: '#e879f9', core: '#701a75', ring: true },
      { x: 280, y: 160, r: 40, mu: 22000, color: '#38bdf8', core: '#075985', craters: 4 },
      { x: 1000, y: 160, r: 40, mu: 22000, color: '#facc15', core: '#854d0e', banded: true },
      { x: 1000, y: 560, r: 44, mu: 26000, color: '#2dd4bf', core: '#0f766e', ring: true },
    ],
    stars: [
      { x: 420, y: 100 },
      { x: 200, y: 360 },
      { x: 1080, y: 360 },
      { x: 280, y: 620 },
      { x: 1120, y: 640 },
      { x: 480, y: 240 },
      { x: 800, y: 480 },
    ],
    powerups: [
      { x: 120, y: 120, kind: 'life' },
      { x: 1160, y: 120, kind: 'shield' },
    ],
    asteroids: [
      { x: 420, y: 360, r: 15, vx: 9, vy: 10, seed: 83 },
      { x: 860, y: 360, r: 15, vx: -9, vy: -8, seed: 97 },
      { x: 640, y: 120, r: 13, vx: 7, vy: 6, seed: 101 },
      { x: 200, y: 560, r: 17, vx: -7, vy: 9, seed: 103 },
      { x: 1080, y: 560, r: 14, vx: 8, vy: -7, seed: 107 },
    ],
  },
  {
    name: 'THE SINGULARITY',
    par: 150,
    fuel: 150,
    start: { x: 120, y: 620 },
    brief: 'FINAL: the black hole at the heart of everything. Collect all eight stars and finish the mission.',
    hazard: 'BLACK HOLE',
    planets: [
      { x: 640, y: 360, r: 70, mu: 90000, color: '#8b5cf6', core: '#1e1b4b', hole: true },
      { x: 870, y: 360, r: 44, mu: 26000, color: '#2dd4bf', core: '#0f766e', craters: 5, orbit: { cx: 640, cy: 360, r: 230, speed: 0.10, phase: 0 } },
      { x: 410, y: 360, r: 44, mu: 26000, color: '#facc15', core: '#854d0e', banded: true, orbit: { cx: 640, cy: 360, r: 230, speed: 0.10, phase: Math.PI } },
    ],
    stars: [
      { x: 640, y: 90 },
      { x: 150, y: 360 },
      { x: 1130, y: 360 },
      { x: 300, y: 640 },
      { x: 980, y: 640 },
      { x: 420, y: 180 },
      { x: 1080, y: 620 },
      { x: 640, y: 560 },
    ],
    powerups: [
      { x: 120, y: 120, kind: 'shield' },
      { x: 1160, y: 120, kind: 'slow' },
      { x: 640, y: 640, kind: 'life' },
      { x: 1160, y: 600, kind: 'fuel' },
    ],
    asteroids: [
      { x: 970, y: 360, r: 15, vx: 0, vy: 14, seed: 113 },
      { x: 805, y: 645, r: 14, vx: -12, vy: 7, seed: 127 },
      { x: 475, y: 645, r: 16, vx: -12, vy: -7, seed: 131 },
      { x: 310, y: 360, r: 15, vx: 0, vy: -14, seed: 137 },
      { x: 475, y: 75, r: 13, vx: 12, vy: -7, seed: 139 },
      { x: 805, y: 75, r: 14, vx: 12, vy: 7, seed: 149 },
    ],
  },
];

// Deep-copy a level's moving parts into live state, so restarts are clean
// and the level data itself is never mutated by the simulation.
export function instantiateLevel(level) {
  const planets = level.planets.map((p) => ({ ...p }));
  const asteroids = (level.asteroids || []).map((a) => {
    const rng = mulberry32(a.seed || 1);
    const verts = [];
    for (let i = 0; i < 9; i++) verts.push(0.72 + rng() * 0.45);
    return { ...a, rot: rng() * Math.PI * 2, rotSpeed: (rng() - 0.5) * 0.7, verts };
  });
  const powerups = (level.powerups || []).map((p) => ({ ...p, taken: false, phase: 0 }));
  return { planets, asteroids, powerups };
}
