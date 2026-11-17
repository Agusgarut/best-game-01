// ORBITAL input: mouse aim + hold-to-charge launch, keyboard alternatives.
// All coordinates are converted into the game's logical 1280x720 space.

import { W, H } from './levels.js';

// actions: { start, launch, restart, toggleMute, skipClear, dismissBrief }
export function attachInput(canvas, g, actions) {
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  };

  const setAimFromMouse = (e) => {
    const p = toLogical(e);
    g.aim.x = p.x;
    g.aim.y = p.y;
    const dx = p.x - g.probe.x;
    const dy = p.y - g.probe.y;
    if (Math.hypot(dx, dy) > 4) g.aimAngle = Math.atan2(dy, dx);
  };

  canvas.addEventListener('mousemove', (e) => {
    setAimFromMouse(e);
  });

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (g.mode === 'title') {
      actions.start();
      return;
    }
    if (g.mode === 'brief') {
      actions.dismissBrief();
      return;
    }
    if (g.mode === 'clear') {
      actions.skipClear();
      return;
    }
    if (g.mode === 'over') {
      actions.restart();
      return;
    }
    if (g.mode === 'aim') {
      setAimFromMouse(e);
      g.charging = true;
      g.power = 0;
    }
  });

  window.addEventListener('mouseup', () => {
    if (g.mode === 'aim' && g.charging) {
      g.charging = false;
      actions.launch();
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'm') {
      actions.toggleMute();
      return;
    }
    if (k === 'r') {
      if (g.mode !== 'title') actions.restart();
      return;
    }
    if (g.mode === 'title' && (k === ' ' || k === 'enter')) {
      e.preventDefault();
      actions.start();
      return;
    }
    if (g.mode === 'over' && (k === ' ' || k === 'enter')) {
      e.preventDefault();
      actions.restart();
      return;
    }
    if (g.mode === 'brief' && (k === ' ' || k === 'enter')) {
      e.preventDefault();
      actions.dismissBrief();
      return;
    }
    if (g.mode === 'clear' && (k === ' ' || k === 'enter')) {
      actions.skipClear();
      return;
    }
    if (g.mode === 'aim') {
      const step = 0.09;
      if (k === 'arrowleft' || k === 'a') {
        g.aimAngle -= step;
        syncAimFromAngle(g);
        e.preventDefault();
      } else if (k === 'arrowright' || k === 'd') {
        g.aimAngle += step;
        syncAimFromAngle(g);
        e.preventDefault();
      } else if (k === 'arrowup' || k === 'w') {
        g.aimAngle -= step;
        syncAimFromAngle(g);
        e.preventDefault();
      } else if (k === 'arrowdown' || k === 's') {
        g.aimAngle += step;
        syncAimFromAngle(g);
        e.preventDefault();
      } else if (k === ' ') {
        g.charging = true;
        g.power = 0;
        e.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && g.mode === 'aim' && g.charging) {
      g.charging = false;
      actions.launch();
    }
  });
}

function syncAimFromAngle(g) {
  g.aim.x = g.probe.x + Math.cos(g.aimAngle) * 220;
  g.aim.y = g.probe.y + Math.sin(g.aimAngle) * 220;
}
