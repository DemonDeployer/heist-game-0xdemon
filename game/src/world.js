// The world: one level at a time, its thief, wardens, cameras, smoke and coin, and
// the alarm that climbs while anyone watches. step() advances the rules one fixed
// tick and reports what happened as event bits.

import { ALARM, FIELD, LEVELS, THIEF, TOOLS } from './config.js';
import { createGuard, updateGuard, sendGuardToInvestigate } from './guards.js';
import { createCamera, updateCamera, cameraCanSee } from './cameras.js';
import { createThief, updateThief } from './thief.js';
import { pointInRect } from './geometry.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_CLEAR = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_SPOTTED = 8;
export const EVENT_LOCKDOWN = 16;
export const EVENT_WIN = 32;

export function createWorld(random) {
  const world = {
    random,
    levelIndex: 0,
    level: LEVELS[0],
    solids: [],
    thief: null,
    guards: [],
    cameras: [],
    clouds: [],
    coin: null,
    alarm: 0,
    alarmPeak: 0,
    spotTime: 0,
    spotted: false,
    lockdownTime: 0,
    time: 0,
    levelTime: 0,
    score: 0,
    lootTaken: false,
    caught: false,
    cleared: false,
    ghostBonus: 0,
    lastTimeBonus: 0,

    loadLevel(index) {
      this.levelIndex = index;
      this.level = LEVELS[index];
      this.solids = [...this.level.walls, ...this.level.cases];
      this.thief = createThief(this.level.start);
      this.guards = this.level.guards.map(createGuard);
      this.cameras = this.level.cameras.map(createCamera);
      this.clouds = [];
      this.coin = null;
      this.alarm = 0;
      this.spotTime = 0;
      this.spotted = false;
      this.lockdownTime = 0;
      this.time = 0;
      this.levelTime = 0;
      this.lootTaken = false;
      this.caught = false;
      this.cleared = false;
      this.ghostBonus = 0;
      this.lastTimeBonus = 0;
    },

    reset() {
      this.score = 0;
      this.alarmPeak = 0;
      this.loadLevel(0);
    },

    spendTool(spent) {
      if (spent.kind === 'coin') {
        let tx = spent.x;
        let ty = spent.y;
        if (tx === 0 && ty === 0) {
          // No mouse target: toss it ahead of where the thief faces.
          tx = this.thief.x + Math.cos(this.thief.facing) * 130;
          ty = this.thief.y + Math.sin(this.thief.facing) * 130;
        }
        const dx = tx - this.thief.x;
        const dy = ty - this.thief.y;
        const distance = Math.hypot(dx, dy) || 1;
        const range = Math.min(distance, TOOLS.coin.throwRange);
        const x = this.thief.x + (dx / distance) * range;
        const y = this.thief.y + (dy / distance) * range;
        this.coin = { x, y, ttl: TOOLS.coin.distractSeconds };
        for (const guard of this.guards) {
          if (Math.hypot(guard.x - x, guard.y - y) < TOOLS.coin.distractRadius) {
            sendGuardToInvestigate(guard, x, y, TOOLS.coin.distractSeconds);
          }
        }
      } else if (spent.kind === 'smoke') {
        this.clouds.push({ x: spent.x, y: spent.y, r: TOOLS.smoke.radius, ttl: TOOLS.smoke.seconds });
      } else if (spent.kind === 'jammer') {
        let best = null;
        let bestDistance = Infinity;
        for (const camera of this.cameras) {
          const distance = Math.hypot(camera.x - this.thief.x, camera.y - this.thief.y);
          if (distance < TOOLS.jammer.range && distance < bestDistance) {
            best = camera;
            bestDistance = distance;
          }
        }
        if (best) best.disabledTime = TOOLS.jammer.seconds;
      }
    },

    step(dt, input) {
      let events = EVENT_NONE;
      this.time += dt;
      this.levelTime += dt;
      if (input) {
        const spent = updateThief(this.thief, input, dt, this.solids);
        if (spent) this.spendTool(spent);
      }
      this.clouds = this.clouds.filter((cloud) => (cloud.ttl -= dt) > 0);
      if (this.coin && (this.coin.ttl -= dt) <= 0) this.coin = null;
      for (const camera of this.cameras) updateCamera(camera, dt, this.time);
      for (const guard of this.guards) updateGuard(guard, dt, this);
      if (this.caught) return EVENT_CAUGHT;

      const seenByGuard = this.guards.some((guard) => guard.spotted);
      let seenByCamera = false;
      for (const camera of this.cameras) {
        camera.watching = cameraCanSee(
          camera, this.thief.x, this.thief.y, this.solids, this.clouds, this.level.shadows, this.thief.sneaking,
        );
        if (camera.watching) seenByCamera = true;
      }
      const seen = seenByGuard || seenByCamera;
      if (seen) {
        const wasSpotted = this.spotted;
        this.spotTime += dt;
        if (this.spotTime > ALARM.graceSeconds) {
          let rate = 0;
          if (seenByGuard) rate += ALARM.guardRate;
          if (seenByCamera) rate += ALARM.cameraRate;
          this.alarm = Math.min(ALARM.max, this.alarm + rate * dt);
          if (!wasSpotted) {
            this.spotted = true;
            events |= EVENT_SPOTTED;
          }
        }
      } else {
        this.spotTime = 0;
        this.spotted = false;
        this.alarm = Math.max(0, this.alarm - ALARM.decayRate * dt);
      }
      this.alarmPeak = Math.max(this.alarmPeak, this.alarm);
      if (this.alarm >= ALARM.max && this.lockdownTime <= 0) {
        this.lockdownTime = ALARM.lockdownSeconds;
        events |= EVENT_LOCKDOWN;
      }
      if (this.lockdownTime > 0) this.lockdownTime -= dt;

      if (!this.lootTaken) {
        const loot = this.level.loot;
        if (Math.hypot(this.thief.x - loot.x, this.thief.y - loot.y) < THIEF.lootDistance) {
          this.lootTaken = true;
          this.score += loot.value;
          events |= EVENT_LOOT;
        }
      }

      if (this.lootTaken && this.lockdownTime <= 0 && pointInRect(this.thief.x, this.thief.y, this.level.exit)) {
        this.cleared = true;
        const timeBonus = Math.max(0, Math.round(300 - this.levelTime * 4));
        this.score += timeBonus;
        this.lastTimeBonus = timeBonus;
        events |= this.levelIndex === LEVELS.length - 1 ? EVENT_WIN : EVENT_CLEAR;
      }
      return events;
    },
  };
  world.loadLevel(0);
  return world;
}
