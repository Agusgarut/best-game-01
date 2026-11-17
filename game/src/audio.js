// AMBLAST sound effects: everything synthesized with WebAudio, no audio files.
// The context is created lazily on the first user gesture (browsers require that).
// In staged screenshot mode the sound engine is never started.

let ctx = null;
let muted = false;

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function ac() {
  if (muted) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// One short oscillator blip with a pitch slide.
function tone(freq0, freq1, dur, type, gain) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function note(freq, delay, dur, type, gain) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click() { tone(700, 900, 0.06, 'sine', 0.12); },
  pick() { tone(420, 620, 0.08, 'triangle', 0.14); },
  drop() { tone(300, 160, 0.09, 'triangle', 0.18); tone(600, 500, 0.07, 'sine', 0.1); },
  deny() { tone(220, 140, 0.16, 'sawtooth', 0.08); },
  gem() { note(1320, 0, 0.12, 'sine', 0.14); note(1760, 0.05, 0.14, 'sine', 0.12); },
  // Clear: bright arpeggio, higher with the combo.
  clear(combo = 1) {
    const base = 523 * Math.pow(1.122, Math.min(combo - 1, 6));
    [0, 1, 2, 3].forEach((i) => note(base * [1, 1.25, 1.5, 2][i], i * 0.055, 0.16, 'triangle', 0.16));
    tone(180, 60, 0.18, 'sine', 0.22);
  },
  combo(n) {
    const base = 660 * Math.pow(1.06, Math.min(n, 8));
    note(base, 0, 0.1, 'square', 0.07);
    note(base * 1.5, 0.07, 0.14, 'square', 0.07);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.22, 'triangle', 0.18));
    note(1319, 0.4, 0.4, 'triangle', 0.16);
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => note(f, i * 0.13, 0.22, 'sawtooth', 0.07));
  },
  star() { note(1568, 0, 0.12, 'sine', 0.14); note(2093, 0.06, 0.18, 'sine', 0.12); },
};
