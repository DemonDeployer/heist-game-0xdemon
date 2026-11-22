# heist-game-0xdemon

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/DemonDeployer/heist-game-0xdemon/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/DemonDeployer/heist-game-0xdemon/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Rook slips into the Marrowbone Museum at night to steal the Gilded Idol. Three rooms stand in the way — patrolling wardens with sweeping vision cones, cameras on the walls, and an alarm that climbs while anyone watches and never forgets. Toss coins to pull wardens away, drop smoke to blind every eye, jam the nearest camera, and hide in the shadow pools where cones barely reach. Grab the gold, then slip out the green exit — and if the alarm never climbs past 25, the getaway is a ghost run worth a bonus.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no dependencies, no network. The game is plain HTML, CSS, and JavaScript under `game/`, and it runs offline in a desktop browser.

## How it plays

- **Move:** WASD or arrow keys. **Shift** sneaks — harder to spot, slower.
- **Tools (each level starts with a fixed few):** `1` toss a coin (or click a spot) to pull a warden away, `2` smoke bomb that blocks all sight for a few seconds, `3` jammer that switches off the nearest camera.
- **The alarm** climbs while a warden or camera watches you (with a short grace on first sighting), falls while you stay hidden, and at 100% locks the exit down for 6 seconds while wardens hunt. A warden touching you ends the run.
- **Score:** loot value + a time bonus per room + a +500 ghost bonus if the alarm never peaks past 25. Best getaway is saved in your browser.
- **Screenshots:** `?shot=title`, `?shot=heist`, `?shot=caught`, `?shot=clear` stage real frames of the game (played forward by an autopilot under the same rules) for the cover and the dossier.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qamf9tkx&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
