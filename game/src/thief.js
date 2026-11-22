// Rook, the thief: walks with WASD or arrows, sneaks with Shift, and spends tools —
// a tossed coin to pull a warden away, a smoke bomb to blind every eye for a few
// seconds, a jammer to switch off the nearest camera. Tools cost charges, and a
// level only ever holds the charges it starts with.

import { FIELD, THIEF, TOOLS } from './config.js';
import { circleHitsRect } from './geometry.js';

export function createThief(start) {
  return {
    x: start.x,
    y: start.y,
    facing: 0,
    sneaking: false,
    moving: false,
    tools: { coin: TOOLS.coin.charges, smoke: TOOLS.smoke.charges, jammer: TOOLS.jammer.charges },
  };
}

function collides(x, y, solids) {
  if (x < THIEF.radius || x > FIELD.width - THIEF.radius) return true;
  if (y < THIEF.radius || y > FIELD.height - THIEF.radius) return true;
  for (let i = 0; i < solids.length; i += 1) {
    if (circleHitsRect(x, y, THIEF.radius, solids[i])) return true;
  }
  return false;
}

// Moves the thief one step. Returns the tool the thief spent this step, if any.
export function updateThief(thief, input, dt, solids) {
  thief.sneaking = input.sneak;
  const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
  let mx = input.moveX;
  let my = input.moveY;
  const length = Math.hypot(mx, my);
  if (length > 1) {
    mx /= length;
    my /= length;
  }
  thief.moving = length > 0.01;
  if (thief.moving) thief.facing = Math.atan2(my, mx);

  const stepX = mx * speed * dt;
  const stepY = my * speed * dt;
  if (!collides(thief.x + stepX, thief.y, solids)) thief.x += stepX;
  if (!collides(thief.x, thief.y + stepY, solids)) thief.y += stepY;

  if (input.tool === 'coin' && thief.tools.coin > 0) {
    thief.tools.coin -= 1;
    return { kind: 'coin', x: input.toolX, y: input.toolY };
  }
  if (input.tool === 'smoke' && thief.tools.smoke > 0) {
    thief.tools.smoke -= 1;
    return { kind: 'smoke', x: thief.x, y: thief.y };
  }
  if (input.tool === 'jammer' && thief.tools.jammer > 0) {
    thief.tools.jammer -= 1;
    return { kind: 'jammer', x: thief.x, y: thief.y };
  }
  return null;
}
