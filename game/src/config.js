// Level data and tuning for The Gilded Vault, a top-down stealth heist game.
// One room per level, each fully visible in a single frame: the thief crosses it,
// wardens patrol with vision cones, cameras sweep, the loot glints gold, and the
// alarm meter climbs whenever anyone is seen. All angles are radians, 0 = east,
// positive = clockwise (canvas y grows downward).

export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'gilded-vault-best';

export const THIEF = {
  radius: 12,
  walkSpeed: 155,
  sneakSpeed: 88,
  // A guard that touches the thief catches them.
  catchDistance: 20,
  // Close enough to pick the loot up.
  lootDistance: 26,
};

export const ALARM = {
  guardRate: 30, // points per second while a warden sees the thief
  cameraRate: 22, // points per second while a camera sees the thief
  decayRate: 14, // points per second while nobody sees the thief
  max: 100,
  // First sighting gets a short grace window so the caught moment feels fair.
  graceSeconds: 0.4,
  // At 100 the museum locks down: the exit seals and wardens hunt.
  lockdownSeconds: 6,
  // Ghost bonus needs the alarm to have stayed low the whole run.
  ghostCeiling: 25,
  ghostBonus: 500,
};

export const TOOLS = {
  coin: { charges: 3, throwRange: 240, distractRadius: 210, distractSeconds: 3 },
  smoke: { charges: 1, radius: 72, seconds: 3 },
  jammer: { charges: 2, range: 280, seconds: 6 },
};

export const LEVELS = [
  {
    name: 'The Gallery',
    sub: 'Room 1 of 3',
    loot: { x: 890, y: 540, name: 'The Starling Painting', value: 500 },
    exit: { x: 24, y: 552, w: 64, h: 20 },
    start: { x: 80, y: 80 },
    // Interior walls only; the field edge itself is the boundary.
    walls: [
      { x: 300, y: 0, w: 24, h: 340 },
      { x: 300, y: 420, w: 24, h: 180 },
      { x: 560, y: 380, w: 400, h: 24 },
    ],
    cases: [
      { x: 150, y: 140, w: 96, h: 56 },
      { x: 620, y: 110, w: 96, h: 56 },
      { x: 690, y: 440, w: 96, h: 56 },
    ],
    shadows: [
      { x: 40, y: 430, w: 150, h: 130 },
      { x: 790, y: 280, w: 130, h: 100 },
    ],
    guards: [
      { x: 140, y: 300, waypoints: [[140, 300], [700, 300]], speed: 55 },
      { x: 830, y: 120, waypoints: [[830, 120], [830, 470]], speed: 48 },
    ],
    cameras: [
      { x: 480, y: 10, base: Math.PI / 2, sweep: 0.7, speed: 0.5, range: 175 },
    ],
  },
  {
    name: 'The Hall of Lenses',
    sub: 'Room 2 of 3',
    loot: { x: 880, y: 80, name: 'The Duchess Sapphire', value: 750 },
    exit: { x: 872, y: 560, w: 64, h: 20 },
    start: { x: 80, y: 520 },
    walls: [
      { x: 200, y: 180, w: 24, h: 240 },
      { x: 700, y: 0, w: 24, h: 300 },
      { x: 420, y: 420, w: 300, h: 24 },
    ],
    cases: [
      { x: 420, y: 120, w: 96, h: 56 },
      { x: 120, y: 420, w: 96, h: 56 },
      { x: 800, y: 420, w: 96, h: 56 },
    ],
    shadows: [
      { x: 40, y: 240, w: 130, h: 120 },
      { x: 560, y: 60, w: 150, h: 90 },
    ],
    guards: [
      { x: 480, y: 300, waypoints: [[480, 300], [780, 300]], speed: 62 },
    ],
    cameras: [
      { x: 120, y: 10, base: Math.PI / 2, sweep: 0.8, speed: 0.6, range: 180 },
      { x: 840, y: 590, base: -Math.PI / 2, sweep: 0.8, speed: 0.55, range: 180 },
    ],
  },
  {
    name: 'The Vault',
    sub: 'Room 3 of 3',
    loot: { x: 480, y: 300, name: 'The Gilded Idol', value: 1500 },
    exit: { x: 924, y: 40, w: 20, h: 64 },
    start: { x: 80, y: 80 },
    // A walled chamber in the middle holds the Idol; two gaps are its doors.
    walls: [
      { x: 380, y: 180, w: 80, h: 24 },
      { x: 500, y: 180, w: 80, h: 24 },
      { x: 380, y: 396, w: 200, h: 24 },
      { x: 380, y: 204, w: 24, h: 192 },
      { x: 556, y: 204, w: 24, h: 60 },
      { x: 556, y: 324, w: 24, h: 72 },
    ],
    cases: [
      { x: 120, y: 120, w: 96, h: 56 },
      { x: 740, y: 120, w: 96, h: 56 },
      { x: 120, y: 430, w: 96, h: 56 },
    ],
    shadows: [
      { x: 40, y: 250, w: 120, h: 110 },
      { x: 820, y: 280, w: 100, h: 100 },
    ],
    guards: [
      { x: 240, y: 120, waypoints: [[240, 120], [660, 120]], speed: 66 },
      { x: 700, y: 140, waypoints: [[700, 140], [700, 460]], speed: 60 },
    ],
    cameras: [
      { x: 480, y: 10, base: Math.PI / 2, sweep: 0.9, speed: 0.7, range: 185 },
      { x: 480, y: 590, base: -Math.PI / 2, sweep: 0.9, speed: 0.65, range: 185 },
    ],
  },
];
