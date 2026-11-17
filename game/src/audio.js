// ORBITAL sound effects: everything synthesized with WebAudio, no audio files.
// The context is created lazily on the first user gesture (browsers require that).
// In staged screenshot mode the sound engine is never started.

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}

export function isMuted() {
  return muted;
}

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

function tone(freq0, freq1, dur, type, gain) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, gain, filterFreq) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  launch() {
    tone(180, 620, 0.28, 'sawtooth', 0.10);
    noise(0.22, 0.08, 2400);
  },
  collect(combo) {
    // Rising chime, pitch climbs with the combo chain.
    const base = 523 * Math.pow(1.122, Math.min(combo, 8));
    tone(base, base, 0.12, 'sine', 0.16);
    setTimeout(() => tone(base * 1.5, base * 1.5, 0.16, 'sine', 0.14), 70);
  },
  crash() {
    noise(0.5, 0.22, 900);
    tone(140, 36, 0.5, 'sawtooth', 0.16);
  },
  clear() {
    // Little fanfare arpeggio.
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone(f, f, 0.22, 'triangle', 0.14), i * 95),
    );
  },
  over() {
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => tone(f, f * 0.94, 0.3, 'triangle', 0.12), i * 140),
    );
  },
  click() {
    tone(700, 700, 0.06, 'square', 0.05);
  },
};
