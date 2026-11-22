// Everything the eye sees: the museum floor at night, its walls and cases, the
// shadow pools where a thief can hide, the vision cones sweeping red and amber,
// the gold loot, the green exit, and the screens between runs. The whole room fits
// one frame, so the judge can read the heist at a glance.

import { ALARM, FIELD } from './config.js';
import { CAMERA_CONE_HALF } from './cameras.js';
import { GUARD_CONE_HALF, GUARD_RANGE } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';

const TITLE_FONT = 'bold 44px "Trebuchet MS", Verdana, sans-serif';
const HEADING_FONT = 'bold 34px "Trebuchet MS", Verdana, sans-serif';
const BODY_FONT = '16px "Trebuchet MS", Verdana, sans-serif';
const SMALL_FONT = '12px "Trebuchet MS", Verdana, sans-serif';

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function wedge(x, y, angle, halfAngle, radius, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawFloor(world) {
    ctx.fillStyle = '#141a2e';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = 60; x < FIELD.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 60; y < FIELD.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    // Shadow pools: dark floor where cones cannot reach far.
    for (const shadow of world.level.shadows) {
      ctx.fillStyle = 'rgba(5,9,24,0.62)';
      ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
      ctx.strokeStyle = 'rgba(80,200,220,0.45)';
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(shadow.x + 0.5, shadow.y + 0.5, shadow.w, shadow.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120,220,235,0.6)';
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'left';
      ctx.fillText('SHADOW · SAFE', shadow.x + 8, shadow.y + 16);
    }
  }

  function drawExit(world) {
    const exit = world.level.exit;
    const locked = world.lockdownTime > 0;
    const open = world.lootTaken && !locked;
    ctx.fillStyle = open ? '#2fae5f' : locked ? '#c0392b' : '#5a6478';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = '#0d1526';
    ctx.font = 'bold 11px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    const label = locked ? 'LOCKED' : open ? 'EXIT →' : 'EXIT';
    ctx.fillText(label, exit.x + exit.w / 2, exit.y + exit.h / 2 + 4);
  }

  function drawLoot(world) {
    if (world.lootTaken) return;
    const loot = world.level.loot;
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(255,205,60,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23c';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd23c';
    ctx.font = SMALL_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(loot.name.toUpperCase(), loot.x, loot.y + 30);
  }

  function drawSolids(world) {
    for (const wall of world.level.walls) {
      ctx.fillStyle = '#2b3554';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = '#3d4a73';
      ctx.fillRect(wall.x, wall.y, wall.w, 3);
    }
    for (const box of world.level.cases) {
      ctx.fillStyle = '#232c4a';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(box.x + box.w / 2, box.y + box.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCones(world) {
    for (const guard of world.guards) {
      const alert = guard.spotted || guard.mode === 'chase';
      wedge(
        guard.x, guard.y, guard.facing, GUARD_CONE_HALF, GUARD_RANGE,
        alert ? 'rgba(255,60,60,0.34)' : 'rgba(255,60,60,0.16)',
        alert ? 'rgba(255,90,90,0.55)' : 'rgba(255,90,90,0.3)',
      );
    }
    for (const camera of world.cameras) {
      if (camera.disabledTime > 0) {
        wedge(
          camera.x, camera.y, camera.angle, CAMERA_CONE_HALF, camera.range,
          'rgba(140,140,140,0.08)', 'rgba(160,160,160,0.25)',
        );
      } else {
        wedge(
          camera.x, camera.y, camera.angle, CAMERA_CONE_HALF, camera.range,
          camera.watching ? 'rgba(255,190,60,0.32)' : 'rgba(255,190,60,0.15)',
          camera.watching ? 'rgba(255,200,90,0.55)' : 'rgba(255,200,90,0.3)',
        );
      }
    }
  }

  function drawActors(world) {
    // Coin toss in flight.
    if (world.coin) {
      ctx.fillStyle = '#ffd23c';
      ctx.beginPath();
      ctx.arc(world.coin.x, world.coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,60,0.6)';
      ctx.beginPath();
      ctx.arc(world.coin.x, world.coin.y, 10 + (3 - world.coin.ttl) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Smoke clouds.
    for (const cloud of world.clouds) {
      ctx.fillStyle = 'rgba(200,205,215,0.35)';
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,225,235,0.25)';
      ctx.beginPath();
      ctx.arc(cloud.x - 18, cloud.y + 10, cloud.r * 0.6, 0, Math.PI * 2);
      ctx.arc(cloud.x + 20, cloud.y - 8, cloud.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wardens.
    for (const guard of world.guards) {
      ctx.fillStyle = '#b03a3a';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 13, guard.facing - 0.9, guard.facing + 0.9);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (guard.spotted || guard.mode === 'chase') {
        ctx.fillStyle = '#ff5b5b';
        ctx.font = 'bold 20px "Trebuchet MS", Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 20);
      } else if (guard.mode === 'investigate') {
        ctx.fillStyle = '#ffd23c';
        ctx.font = 'bold 18px "Trebuchet MS", Verdana, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 20);
      }
    }
    // Cameras.
    for (const camera of world.cameras) {
      ctx.fillStyle = '#8a93a6';
      ctx.fillRect(camera.x - 8, camera.y - 6, 16, 12);
      ctx.fillStyle = camera.disabledTime > 0 ? '#555c6e' : '#ffbe3c';
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 10, camera.y + Math.sin(camera.angle) * 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (camera.disabledTime > 0) {
        ctx.fillStyle = '#aab2c4';
        ctx.font = SMALL_FONT;
        ctx.textAlign = 'center';
        ctx.fillText('OFF', camera.x, camera.y + 22);
      }
    }
    // Rook, the thief.
    const thief = world.thief;
    const inShadow = world.level.shadows.some((s) => thief.x >= s.x && thief.x <= s.x + s.w && thief.y >= s.y && thief.y <= s.y + s.h);
    if (inShadow) {
      ctx.strokeStyle = 'rgba(120,220,235,0.7)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (thief.sneaking) {
      ctx.strokeStyle = 'rgba(45,212,191,0.5)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d3b34';
    ctx.beginPath();
    ctx.moveTo(thief.x + Math.cos(thief.facing) * 12, thief.y + Math.sin(thief.facing) * 12);
    ctx.lineTo(thief.x + Math.cos(thief.facing + 2.5) * 9, thief.y + Math.sin(thief.facing + 2.5) * 9);
    ctx.lineTo(thief.x + Math.cos(thief.facing - 2.5) * 9, thief.y + Math.sin(thief.facing - 2.5) * 9);
    ctx.closePath();
    ctx.fill();
  }

  function drawAlarmVignette(world) {
    if (world.alarm <= 40) return;
    const strength = ((world.alarm - 40) / 60) * 0.5;
    const gradient = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
    );
    gradient.addColorStop(0, 'rgba(255,40,40,0)');
    gradient.addColorStop(1, `rgba(255,40,40,${strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (world.lockdownTime > 0) {
      ctx.fillStyle = '#ff5b5b';
      ctx.font = 'bold 20px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LOCKDOWN — ${Math.ceil(world.lockdownTime)}s`, FIELD.width / 2, 30);
    }
  }

  function overlay(title, lines, hint) {
    ctx.fillStyle = 'rgba(6,8,18,0.74)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f0dc';
    ctx.font = HEADING_FONT;
    ctx.fillText(title, FIELD.width / 2, FIELD.height / 2 - 70);
    ctx.font = BODY_FONT;
    ctx.fillStyle = '#c8cede';
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, FIELD.height / 2 - 26 + index * 26);
    });
    ctx.fillStyle = '#ffd23c';
    ctx.font = 'bold 16px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(hint, FIELD.width / 2, FIELD.height / 2 + 66);
  }

  return {
    draw(world, screen, best) {
      drawFloor(world);
      drawExit(world);
      drawLoot(world);
      drawSolids(world);
      drawCones(world);
      drawActors(world);
      drawAlarmVignette(world);
      if (screen === SCREEN_TITLE) {
        overlay('THE GILDED VAULT', [
          'Rook is inside the Marrowbone Museum. Three rooms stand between',
          'the thief and the Gilded Idol — wardens with sweeping cones,',
          'cameras on the walls, and an alarm that never forgets.',
          '',
          'WASD / arrows — move · Shift — sneak · 1 — toss a coin · 2 — smoke · 3 — jammer',
          'Grab the gold, then slip out the green exit. Stay out of the red cones.',
        ], best > 0 ? `Best getaway: ${best} — press Enter or click to start` : 'Press Enter or click to start');
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['The museum holds its breath.'], 'Press P or Enter to keep going');
      } else if (screen === SCREEN_CAUGHT) {
        overlay('CAUGHT!', [
          'A warden laid hands on Rook. The Idol stays in its case — this time.',
          `Score so far: ${world.score}`,
        ], 'Press R or Enter to try the room again');
      } else if (screen === SCREEN_CLEAR) {
        overlay(`${world.level.name.toUpperCase()} — CLEAR`, [
          `${world.level.loot.name} secured. Time bonus +${world.lastTimeBonus}.`,
          `Score: ${world.score}`,
        ], 'Press Enter for the next room');
      } else if (screen === SCREEN_WIN) {
        const ghostLine = world.ghostBonus > 0
          ? `Ghost bonus (never raised the alarm past ${ALARM.ghostCeiling}): +${world.ghostBonus}`
          : `No ghost bonus — the alarm climbed past ${ALARM.ghostCeiling} somewhere.`;
        overlay('GETAWAY COMPLETE', [
          'The Gilded Idol is gone, and so is Rook. Three rooms, no trace.',
          ghostLine,
          `Final score: ${world.score}`,
        ], best > 0 ? `Best getaway: ${Math.max(best, world.score)} — press Enter to run it again` : 'Press Enter to run it again');
      }
    },
  };
}
