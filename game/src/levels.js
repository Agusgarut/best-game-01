// ORBITAL level data: 5 handcrafted star systems.
// Coordinates are in the game's logical 1280x720 space.
// planet: { x, y, r, mu, color, core } — mu is the gravity strength (G*m).
// star: { x, y } — collectible stars. start: { x, y } — launch pad.
// par: seconds for the time bonus. fuel: starting fuel for the level.
export const W = 1280;
export const H = 720;

export const LEVELS = [
  {
    name: 'FIRST LIGHT',
    par: 45,
    fuel: 100,
    start: { x: 120, y: 620 },
    planets: [
      { x: 640, y: 380, r: 55, mu: 30000, color: '#2dd4bf', core: '#0f766e' },
    ],
    stars: [
      { x: 640, y: 170 },
      { x: 950, y: 300 },
      { x: 360, y: 560 },
    ],
  },
  {
    name: 'TWIN SUNS',
    par: 60,
    fuel: 100,
    start: { x: 110, y: 120 },
    planets: [
      { x: 430, y: 300, r: 48, mu: 26000, color: '#fb923c', core: '#9a3412' },
      { x: 880, y: 430, r: 52, mu: 30000, color: '#a78bfa', core: '#5b21b6' },
    ],
    stars: [
      { x: 430, y: 110 },
      { x: 1090, y: 180 },
      { x: 640, y: 580 },
      { x: 880, y: 620 },
      { x: 190, y: 320 },
    ],
  },
  {
    name: 'THE GAUNTLET',
    par: 75,
    fuel: 110,
    start: { x: 120, y: 620 },
    planets: [
      { x: 400, y: 200, r: 45, mu: 24000, color: '#f472b6', core: '#9d174d' },
      { x: 880, y: 240, r: 50, mu: 28000, color: '#38bdf8', core: '#075985' },
      { x: 640, y: 520, r: 60, mu: 34000, color: '#a3e635', core: '#3f6212' },
    ],
    stars: [
      { x: 640, y: 90 },
      { x: 1120, y: 420 },
      { x: 400, y: 420 },
      { x: 880, y: 480 },
      { x: 180, y: 300 },
      { x: 1080, y: 620 },
    ],
  },
  {
    name: 'CROSSWINDS',
    par: 90,
    fuel: 120,
    start: { x: 640, y: 650 },
    planets: [
      { x: 330, y: 220, r: 46, mu: 26000, color: '#facc15', core: '#854d0e' },
      { x: 950, y: 200, r: 46, mu: 26000, color: '#2dd4bf', core: '#0f766e' },
      { x: 330, y: 520, r: 50, mu: 30000, color: '#a78bfa', core: '#5b21b6' },
      { x: 950, y: 520, r: 50, mu: 30000, color: '#fb7185', core: '#881337' },
    ],
    stars: [
      { x: 640, y: 120 },
      { x: 640, y: 360 },
      { x: 120, y: 360 },
      { x: 1160, y: 360 },
      { x: 640, y: 600 },
      { x: 480, y: 480 },
      { x: 800, y: 480 },
    ],
  },
  {
    name: 'EVENT HORIZON',
    par: 110,
    fuel: 130,
    start: { x: 120, y: 100 },
    planets: [
      { x: 640, y: 360, r: 82, mu: 62000, color: '#e879f9', core: '#701a75' },
      { x: 300, y: 560, r: 44, mu: 24000, color: '#38bdf8', core: '#075985' },
      { x: 1000, y: 150, r: 44, mu: 24000, color: '#facc15', core: '#854d0e' },
      { x: 1020, y: 580, r: 48, mu: 28000, color: '#2dd4bf', core: '#0f766e' },
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
  },
];
