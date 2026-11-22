// Small synthesised sounds, made with the Web Audio API and no audio files: a
// chime for loot, a rising sting when the alarm climbs, a low thud for being
// caught, and a bright arpeggio for the getaway. Silent until the first key or
// click, as browsers require.

let context = null;

export function ensureAudio() {
  try {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

function blip(frequency, seconds, type, gainValue, when = 0) {
  if (!context) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(gainValue, context.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + when + seconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(context.currentTime + when);
    oscillator.stop(context.currentTime + when + seconds + 0.05);
  } catch {
    // Sound is garnish: a failure here never stops the game.
  }
}

export const sounds = {
  click() {
    blip(660, 0.08, 'sine', 0.08);
  },
  loot() {
    blip(880, 0.12, 'sine', 0.12);
    blip(1318, 0.2, 'sine', 0.1, 0.09);
  },
  spotted() {
    blip(220, 0.25, 'sawtooth', 0.07);
    blip(311, 0.3, 'sawtooth', 0.07, 0.12);
  },
  caught() {
    blip(160, 0.5, 'sawtooth', 0.12);
    blip(110, 0.6, 'square', 0.08, 0.15);
  },
  clear() {
    blip(523, 0.12, 'sine', 0.1);
    blip(659, 0.12, 'sine', 0.1, 0.1);
    blip(784, 0.25, 'sine', 0.1, 0.2);
  },
  win() {
    [523, 659, 784, 1046].forEach((frequency, index) => blip(frequency, 0.22, 'sine', 0.1, index * 0.11));
  },
};
