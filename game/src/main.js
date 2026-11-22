// Boot and game loop: either a screenshot pose (?shot=...) or the real game —
// title, three rooms, caught, cleared, and the getaway, on a fixed 60 Hz clock
// with the HUD kept in step from the world.

import { ALARM, BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_CLEAR, EVENT_LOCKDOWN, EVENT_LOOT, EVENT_SPOTTED, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RETRY, createInput } from './input.js';
import {
  createRenderer, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';
import { ensureAudio, sounds } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const hud = {
  level: document.getElementById('hud-level'),
  alarmFill: document.getElementById('hud-alarm-fill'),
  alarmText: document.getElementById('hud-alarm-text'),
  loot: document.getElementById('hud-loot'),
  score: document.getElementById('hud-score'),
  tools: document.getElementById('hud-tools'),
  time: document.getElementById('hud-time'),
};

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

let screen = SCREEN_TITLE;
let best = 0;
try {
  best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
} catch {
  best = 0;
}

function saveBest() {
  if (world.score > best) {
    best = world.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // A private window must not stop the game.
    }
  }
}

function updateHud() {
  const loot = world.level.loot;
  hud.level.textContent = `Room ${world.levelIndex + 1}/3 — ${world.level.name}`;
  hud.alarmFill.style.width = `${Math.round(world.alarm)}%`;
  hud.alarmFill.classList.toggle('hot', world.alarm >= 70);
  hud.alarmText.textContent = world.lockdownTime > 0
    ? `LOCKDOWN ${Math.ceil(world.lockdownTime)}s`
    : `Alarm ${Math.round(world.alarm)}%`;
  hud.loot.textContent = world.lootTaken ? `Loot: ${loot.name} ✓` : `Loot: ${loot.name}`;
  hud.score.textContent = `Score ${world.score}`;
  const tools = world.thief.tools;
  hud.tools.textContent = `Coin ×${tools.coin} · Smoke ×${tools.smoke} · Jammer ×${tools.jammer}`;
  hud.time.textContent = `Time ${Math.floor(world.time)}s`;
  const parts = [
    `Room ${world.levelIndex + 1} of 3, ${world.level.name}.`,
    world.lootTaken ? 'Loot secured — reach the green exit.' : `Steal the ${loot.name}.`,
    `Alarm ${Math.round(world.alarm)} percent. Score ${world.score}.`,
  ];
  statusEl.textContent = parts.join(' ');
}

function describeEvents(events) {
  if (events & EVENT_SPOTTED) sounds.spotted();
  if (events & EVENT_LOOT) sounds.loot();
  if (events & EVENT_LOCKDOWN) sounds.spotted();
  if (events & EVENT_CLEAR) {
    sounds.clear();
    screen = SCREEN_CLEAR;
  }
  if (events & EVENT_WIN) {
    world.ghostBonus = world.alarmPeak < ALARM.ghostCeiling ? ALARM.ghostBonus : 0;
    world.score += world.ghostBonus;
    sounds.win();
    saveBest();
    screen = SCREEN_WIN;
  }
  if (events & EVENT_CAUGHT) {
    sounds.caught();
    saveBest();
    screen = SCREEN_CAUGHT;
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world, screen, best);
    updateHud();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 960,
      y: ((clientY - rect.top) / rect.height) * 600,
    };
  });
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const actions = input.takeActions();
    if (actions & (ACTION_CONFIRM | ACTION_RETRY)) ensureAudio();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      world.reset();
      screen = SCREEN_PLAY;
      sounds.click();
    } else if (screen === SCREEN_CLEAR && (actions & ACTION_CONFIRM)) {
      world.loadLevel(world.levelIndex + 1);
      screen = SCREEN_PLAY;
      sounds.click();
    } else if (screen === SCREEN_CAUGHT && (actions & (ACTION_CONFIRM | ACTION_RETRY))) {
      world.loadLevel(world.levelIndex);
      screen = SCREEN_PLAY;
      sounds.click();
    } else if (screen === SCREEN_WIN && (actions & ACTION_CONFIRM)) {
      world.reset();
      screen = SCREEN_PLAY;
      sounds.click();
    }

    if (screen === SCREEN_PLAY) {
      accumulator += Math.min(0.1, (now - last) / 1000);
      while (accumulator >= STEP) {
        const events = world.step(STEP, input.read());
        describeEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    }
    last = now;
    renderer.draw(world, screen, best);
    updateHud();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
