// The wall cameras: fixed to the wall, sweeping their cone back and forth. A camera
// never catches the thief itself, but while it watches, the alarm climbs — and a
// jammer can switch one off for a few seconds.

import { angleDifference, lineOfSightClear, pointInRect, smokeBlocksSight } from './geometry.js';

export const CAMERA_CONE_HALF = (26 * Math.PI) / 180;

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    base: def.base,
    sweep: def.sweep,
    speed: def.speed,
    range: def.range,
    angle: def.base,
    disabledTime: 0,
    watching: false,
  };
}

export function updateCamera(camera, dt, time) {
  if (camera.disabledTime > 0) camera.disabledTime -= dt;
  camera.angle = camera.base + Math.sin(time * camera.speed) * camera.sweep;
}

export function cameraCanSee(camera, tx, ty, solids, clouds, shadows, sneaking = false) {
  if (camera.disabledTime > 0) return false;
  const dx = tx - camera.x;
  const dy = ty - camera.y;
  const distance = Math.hypot(dx, dy);
  let range = camera.range;
  if (sneaking) range *= 0.7;
  let hidden = false;
  for (let i = 0; i < shadows.length; i += 1) {
    if (pointInRect(tx, ty, shadows[i])) {
      hidden = true;
      break;
    }
  }
  if (hidden) range = Math.min(range, 62);
  if (distance > range) return false;
  if (distance > 4 && Math.abs(angleDifference(Math.atan2(dy, dx), camera.angle)) > CAMERA_CONE_HALF) return false;
  if (!lineOfSightClear(camera.x, camera.y, tx, ty, solids)) return false;
  if (smokeBlocksSight(camera.x, camera.y, tx, ty, clouds)) return false;
  return true;
}
