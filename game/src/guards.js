// The night wardens: they walk their patrol, and when they see the thief they give
// chase. A warden sees the thief inside its vision cone when the line of sight is
// clear and no smoke stands between them; a thief crouched in shadow must be close
// to be spotted at all.

import { ALARM, THIEF } from './config.js';
import { angleDifference, lineOfSightClear, pointInRect, smokeBlocksSight } from './geometry.js';

export const GUARD_CONE_HALF = (62 * Math.PI) / 180;
export const GUARD_RANGE = 150;
export const GUARD_CHASE_SPEED = 92;

export function createGuard(def) {
  return {
    x: def.x,
    y: def.y,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    speed: def.speed,
    facing: 0,
    // patrol | chase | investigate | return
    mode: 'patrol',
    investigateX: 0,
    investigateY: 0,
    investigateTime: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    lastSeenTime: -99,
    spotted: false,
  };
}

// True when this guard can see the point (the thief) right now. Sneaking shrinks
// the range a guard can spot from; hiding in shadow shrinks it further.
export function guardCanSee(guard, tx, ty, solids, clouds, shadows, sneaking = false) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  let range = GUARD_RANGE;
  if (sneaking) range *= 0.7;
  let hidden = false;
  for (let i = 0; i < shadows.length; i += 1) {
    if (pointInRect(tx, ty, shadows[i])) {
      hidden = true;
      break;
    }
  }
  // In shadow the thief must be close to be spotted.
  if (hidden) range = Math.min(range, 58);
  if (distance > range) return false;
  if (distance > 4 && Math.abs(angleDifference(Math.atan2(dy, dx), guard.facing)) > GUARD_CONE_HALF) return false;
  if (!lineOfSightClear(guard.x, guard.y, tx, ty, solids)) return false;
  if (smokeBlocksSight(guard.x, guard.y, tx, ty, clouds)) return false;
  return true;
}

function moveToward(guard, tx, ty, speed, dt, solids) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  guard.facing = Math.atan2(dy, dx);
  guard.x = nx;
  guard.y = ny;
  return distance - step < 2;
}

export function updateGuard(guard, dt, world) {
  const thief = world.thief;
  const seen = guardCanSee(guard, thief.x, thief.y, world.solids, world.clouds, world.level.shadows, thief.sneaking);
  guard.spotted = seen;
  // Bumping into a warden ends the run whatever the warden was doing.
  if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < THIEF.catchDistance) {
    world.caught = true;
    return;
  }
  if (seen) {
    guard.lastSeenX = thief.x;
    guard.lastSeenY = thief.y;
    guard.lastSeenTime = world.time;
    guard.mode = 'chase';
  }

  if (guard.mode === 'chase') {
    const arrived = moveToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD_CHASE_SPEED, dt, world.solids);
    if (world.time - guard.lastSeenTime > 2.5 || arrived) guard.mode = 'return';
    return;
  }

  if (guard.mode === 'investigate') {
    guard.investigateTime -= dt;
    const arrived = moveToward(guard, guard.investigateX, guard.investigateY, guard.speed * 1.15, dt, world.solids);
    if (arrived || guard.investigateTime <= 0) guard.mode = 'return';
    return;
  }

  if (guard.mode === 'return') {
    const target = guard.waypoints[guard.waypointIndex];
    const arrived = moveToward(guard, target[0], target[1], guard.speed, dt, world.solids);
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.mode = 'patrol';
    }
    return;
  }

  // patrol
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target[0], target[1], guard.speed, dt, world.solids);
  if (arrived) guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
}

export function sendGuardToInvestigate(guard, x, y, seconds) {
  guard.mode = 'investigate';
  guard.investigateX = x;
  guard.investigateY = y;
  guard.investigateTime = seconds;
}
