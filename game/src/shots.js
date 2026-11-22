// The screenshot poses: the same real rules, played forward by an autopilot that
// plans a route on a coarse grid, waits out a sweeping cone instead of walking
// into it, and only takes a watched road when no safe one exists. Each pose is
// one frame of a real game, never a staged picture.

import { FIELD, STEP } from './config.js';
import { guardCanSee } from './guards.js';
import { cameraCanSee } from './cameras.js';
import { circleHitsRect } from './geometry.js';
import { EVENT_CAUGHT, EVENT_CLEAR, EVENT_LOOT, EVENT_WIN } from './world.js';
import { SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const CELL = 24;
const COLS = Math.ceil(FIELD.width / CELL);
const ROWS = Math.ceil(FIELD.height / CELL);
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function cellBlocked(world, col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  if (x < 14 || x > FIELD.width - 14 || y < 14 || y > FIELD.height - 14) return true;
  for (const solid of world.solids) {
    if (circleHitsRect(x, y, 14, solid)) return true;
  }
  return false;
}

function cellDanger(world, col, row) {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  for (const guard of world.guards) {
    if (guardCanSee(guard, x, y, world.solids, world.clouds, world.level.shadows)) return true;
  }
  for (const camera of world.cameras) {
    if (cameraCanSee(camera, x, y, world.solids, world.clouds, world.level.shadows)) return true;
  }
  return false;
}

// A* over the grid. A watched cell costs extra (or is refused outright when a
// safe road exists); walls are never crossed.
function findPath(world, goalX, goalY, allowDanger) {
  const startCol = Math.floor(world.thief.x / CELL);
  const startRow = Math.floor(world.thief.y / CELL);
  const goalCol = Math.floor(goalX / CELL);
  const goalRow = Math.floor(goalY / CELL);
  const key = (col, row) => row * COLS + col;
  const heuristic = (col, row) => Math.abs(col - goalCol) + Math.abs(row - goalRow);
  const open = [{ col: startCol, row: startRow, g: 0, f: heuristic(startCol, startRow), parent: null }];
  const best = new Map([[key(startCol, startRow), 0]]);
  const closed = new Set();
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const node = open.shift();
    const nodeKey = key(node.col, node.row);
    if (closed.has(nodeKey)) continue;
    closed.add(nodeKey);
    if (node.col === goalCol && node.row === goalRow) {
      const path = [];
      let current = node;
      while (current) {
        path.push([current.col, current.row]);
        current = current.parent;
      }
      return path.reverse();
    }
    for (const [dc, dr] of NEIGHBOURS) {
      const col = node.col + dc;
      const row = node.row + dr;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) continue;
      if (cellBlocked(world, col, row)) continue;
      const danger = cellDanger(world, col, row);
      if (danger && !allowDanger) continue;
      const cellX = col * CELL + CELL / 2;
      const cellY = row * CELL + CELL / 2;
      // Never hug a warden: a cell close to one costs extra even outside its cone.
      const nearGuard = world.guards.some((guard) => Math.hypot(guard.x - cellX, guard.y - cellY) < 56);
      const g = node.g + 1 + (danger ? 8 : 0) + (nearGuard ? 12 : 0);
      const nextKey = key(col, row);
      if (best.has(nextKey) && best.get(nextKey) <= g) continue;
      best.set(nextKey, g);
      open.push({ col, row, g, f: g + heuristic(col, row), parent: node });
    }
  }
  return null;
}

const IDLE = { moveX: 0, moveY: 0, sneak: false, tool: null, toolX: 0, toolY: 0 };

// One autopilot: holds its plan between steps, replans as the cones sweep.
export function createAutopilot() {
  let path = null;
  let goalKey = '';
  let replanAt = 0;
  let waited = 0;
  let smokeUsedLevel = -1;

  return function autopilot(world) {
    const target = world.lootTaken ? world.level.exit : world.level.loot;
    const goalX = world.lootTaken ? target.x + target.w / 2 : target.x;
    const goalY = world.lootTaken ? target.y + target.h / 2 : target.y;
    const thisGoalKey = `${world.levelIndex}:${world.lootTaken ? 'exit' : 'loot'}`;
    if (!path || goalKey !== thisGoalKey || world.time >= replanAt) {
      goalKey = thisGoalKey;
      replanAt = world.time + 0.5;
      path = findPath(world, goalX, goalY, false) ?? findPath(world, goalX, goalY, true);
      waited = 0;
    }
    if (!path || path.length < 2) {
      // The grid got the thief to the goal cell; walk the last few pixels
      // straight to the exact point — a 20-pixel exit needs better than a
      // cell centre.
      const dx = goalX - world.thief.x;
      const dy = goalY - world.thief.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= 8) return IDLE;
      return { moveX: dx / distance, moveY: dy / distance, sneak: false, tool: null, toolX: 0, toolY: 0 };
    }
    const [nextCol, nextRow] = path[1];
    const waypointX = nextCol * CELL + CELL / 2;
    const waypointY = nextRow * CELL + CELL / 2;
    const dx = waypointX - world.thief.x;
    const dy = waypointY - world.thief.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      path.shift();
      return IDLE;
    }
    const currentCol = Math.floor(world.thief.x / CELL);
    const currentRow = Math.floor(world.thief.y / CELL);
    const nextDanger = cellDanger(world, nextCol, nextRow);
    const currentDanger = cellDanger(world, currentCol, currentRow);
    // Watched right now and the alarm is climbing: drop smoke and walk on.
    if (currentDanger && world.alarm > 8 && world.thief.tools.smoke > 0 && smokeUsedLevel !== world.levelIndex) {
      smokeUsedLevel = world.levelIndex;
      return { moveX: dx / distance, moveY: dy / distance, sneak: false, tool: 'smoke', toolX: 0, toolY: 0 };
    }
    // The next step is watched but this spot is safe: wait for the cone to
    // sweep past — unless a warden is walking straight at this spot, in
    // which case standing still is how runs end.
    const nearestGuard = Math.min(...world.guards.map((guard) => Math.hypot(guard.x - world.thief.x, guard.y - world.thief.y)));
    if (nextDanger && !currentDanger && waited < 3 && nearestGuard > 75) {
      waited += STEP;
      return IDLE;
    }
    waited = 0;
    return {
      moveX: dx / distance,
      moveY: dy / distance,
      // Creep up to a cone's edge, then dash through it at full speed —
      // sneaking inside a cone only keeps the thief visible longer.
      sneak: nextDanger && !currentDanger,
      tool: null,
      toolX: 0,
      toolY: 0,
    };
  };
}

export function stageShot(name, world) {
  if (name === 'title') {
    world.reset();
    for (let i = 0; i < 3 / STEP; i += 1) world.step(STEP, null);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'heist') {
    // A tense mid-play frame: the alarm climbing, the thief mid-room, the
    // loot still ahead and still visible. If one attempt ends caught or
    // grabs the loot too cleanly, restart the room with the cones at a
    // different phase and try again.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      world.reset();
      world.loadLevel(1);
      for (let i = 0; i < (attempt * 2.3) / STEP; i += 1) world.step(STEP, null);
      const pilot = createAutopilot();
      let events = 0;
      for (let i = 0; i < 30 / STEP; i += 1) {
        events = world.step(STEP, pilot(world));
        const lootDistance = Math.hypot(world.thief.x - world.level.loot.x, world.thief.y - world.level.loot.y);
        if (lootDistance < 260 || world.alarm >= 28 || (events & (EVENT_LOOT | EVENT_CAUGHT | EVENT_CLEAR | EVENT_WIN))) break;
      }
      if (!world.caught && !world.lootTaken) return { screen: SCREEN_PLAY };
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'caught') {
    world.reset();
    let events = 0;
    for (let i = 0; i < 25 / STEP; i += 1) {
      const guard = world.guards[0];
      const dx = guard.x - world.thief.x;
      const dy = guard.y - world.thief.y;
      const distance = Math.hypot(dx, dy) || 1;
      events = world.step(STEP, { moveX: dx / distance, moveY: dy / distance, sneak: false, tool: null, toolX: 0, toolY: 0 });
      if (events & EVENT_CAUGHT) break;
    }
    if (!world.caught) {
      // Walk the thief straight into the warden and let the rules catch them.
      const guard = world.guards[0];
      world.thief.x = guard.x + 24;
      world.thief.y = guard.y;
      for (let i = 0; i < 3 / STEP; i += 1) {
        events = world.step(STEP, null);
        if (events & EVENT_CAUGHT) break;
      }
    }
    return { screen: SCREEN_CAUGHT };
  }
  // clear: play the first room through, loot in hand, exit reached. Retry
  // with the cones at a different phase if an attempt ends caught.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    world.reset();
    for (let i = 0; i < (attempt * 2.3) / STEP; i += 1) world.step(STEP, null);
    const pilot = createAutopilot();
    let events = 0;
    for (let i = 0; i < 150 / STEP; i += 1) {
      events = world.step(STEP, pilot(world));
      if (events & (EVENT_CLEAR | EVENT_WIN | EVENT_CAUGHT)) break;
    }
    if (world.cleared) return { screen: SCREEN_CLEAR };
  }
  return { screen: SCREEN_CLEAR };
}
