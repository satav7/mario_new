# Super Mario — Pixel Adventure

A fan-made, browser-based platformer built from scratch with vanilla **HTML, CSS, and JavaScript**. The game renders to a single `<canvas>` and synthesizes all music and sound effects at runtime — no frameworks, external assets, or build step.

## Project rules

> Every time a change is made to the project it has to be updated here with the date and time of the change, a brief summary of what changed, the files affected, and the results/errors observed. Do not finish a change without updating this file.
>
> Do **not** commit or push to GitHub online without asking first. Ask before pushing commits online.

## Play

1. Open `index.html` in a modern browser (double-click it — no server required).
2. Click **START GAME**.
3. Enter a player name, choose a region, and press **START ADVENTURE**.
4. Reach the flagpole at the end of all three worlds.

Sound starts after the first interaction because of browser autoplay rules. Profile and best-score persistence use `localStorage`; private browsing or some `file://` setups may block storage, in which case the game still runs with default values.

## Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` |
| Jump | `Space`, `W`, or `↑` |
| Run | `Shift` |
| Throw fireball | `X` or `J` |
| Pause / resume | `P` or `Esc` |
| Mute / unmute | `M` |
| Submit profile | `Enter` |
| Back from profile | `Esc` |

On-screen touch controls appear automatically on phones and tablets.

## Features

- **Three hand-built worlds** with separate themes, parallax backgrounds, and increasing difficulty.
- **Tile-based platforming** with acceleration, friction, variable jump height, coyote time, and jump buffering.
- **Enemies:** Goombas, Koopas with kickable shells, and pipe-dwelling piranha plants.
- **Blocks and pickups:** question blocks, breakable bricks, coins, mushrooms, fire flowers, and pipes.
- **Fireballs** that bounce, destroy enemies, and are limited to two on screen at a time.
- **Profile setup:** player name, region selection, persistent local profile, and per-region best scores.
- **HUD:** player name, score, coins, world, timer, lives, and region.
- **Chiptune soundtrack and synthesized sound effects** generated with the Web Audio API.
- **Full game flow:** title screen, profile setup, level intro cards, pause, death/respawn, game over, level clear, and victory.
- **Responsive canvas** that scales to the window while keeping the 2:1 aspect ratio.

## Player profile and regions

The profile screen appears when starting a new run from the title screen (retries and restarts keep the current profile):

- **Name:** up to 12 characters, trimmed, uppercased, sanitized, and safely escaped in all overlays.
- **Region:** North America, South America, Europe, Africa, Asia, Middle East, or Oceania.
- The browser language is used to preselect a region when no profile is saved yet.
- The name appears in the in-game HUD, level cards, pause screen, game-over screen, and victory screen.
- Best scores are stored **per region** on the device. There is no online leaderboard.
- Profile data is saved under `mario-browser-profile`; regional bests use `mario-browser-best-<region-id>`.

## Worlds

| World | Theme | Notes |
| --- | --- | --- |
| **1-1 Sunny Plains** | Overworld | Introductory level with pipes, pits, staircases, and a first piranha plant. |
| **1-2 Shadow Caverns** | Underground | Cave ceilings, tighter platforms, more Koopas, and multiple pits. |
| **1-3 Sunset Citadel** | Sunset/castle | Hardest layout with longer gaps, staircase jumps, and heavy enemy placement. |

Each world ends with a flagpole slide, castle walk, time bonus, and transition to the next world.

## Scoring and lives

| Event | Points |
| --- | --- |
| Coin | 200 |
| Goomba stomp/defeat | 100 |
| Koopa stomp | 100; shell kick/defeat 200 |
| Piranha plant | 200 |
| Brick break | 50 |
| Mushroom / fire flower | 1000 |
| Flagpole | 1000 plus time bonus |

- Collect **100 coins** for an extra life.
- Start with **3 lives**. Falling into a pit, touching an enemy while small, or running out of time costs a life.
- Big Mario shrinks when hit and gets brief invulnerability; Fire Mario loses the fire power on a hit.

## Project structure

```text
Mario/
├─ index.html            Entry point and canvas/overlay markup
├─ css/
│  └─ style.css          Layout, HUD panels, profile form, touch controls
├─ js/
│  ├─ utils.js           Math helpers and keyboard/touch input
│  ├─ levels.js          Level builder and all three world layouts
│  ├─ audio.js           Web Audio sound effects and chiptune sequencer
│  ├─ entities.js        Goomba, Koopa, piranha, mushroom, fireball
│  ├─ player.js          Mario physics, power state, damage, flag sequence
│  ├─ render.js          Backgrounds, tiles, sprites, HUD
│  └─ game.js            Game loop, states, collisions, profile, scoring
├─ .test-harness.js      Development-only headless logic test harness
├─ server.log            Harmless leftover log from an early local test
└─ README.md
```

The scripts are classic browser scripts loaded in dependency order, not ES modules, so the game works directly from `file://`.

## Development

- **No build step or dependencies.** Edit the source and refresh the browser.
- **Test the game logic headlessly:**

  ```bash
  node .test-harness.js
  ```

  The harness simulates the DOM, input, canvas, and frames. It covers movement, jumping, blocks, power-ups, stomping, fireballs, death/respawn, profile persistence, per-region bests, level transitions, and full-level traversal.

- **Debug:** `window.game` exposes the active game instance in the browser console.
- **Browser support:** current Chrome, Edge, Firefox, and Safari with Canvas 2D and Web Audio support.

`.test-harness.js` and `server.log` are development artifacts and are not used at runtime. They can be removed once the test harness is no longer needed.

## Attribution

This is a fan-made tribute project. Mario and related characters are trademarks of Nintendo. This project is not affiliated with or endorsed by Nintendo.

## Change log

All times are local project time (AEDT, UTC+11).

| Date and time | Summary | Files changed | Results / errors |
| --- | --- | --- | --- |
| 2026-11-19 02:10 | Repository initialized with Git text normalization. | `.gitattributes` | Initial repository setup; no errors. |
| 2026-11-19 02:13 | First playable iteration: full three-world canvas platformer, physics, enemies, power-ups, HUD, audio, and touch controls. Development test harness added. | `index.html`, `css/style.css`, `js/utils.js`, `js/levels.js`, `js/audio.js`, `js/entities.js`, `js/player.js`, `js/render.js`, `js/game.js`, `.test-harness.js`, `server.log` | Headless mechanics and traversal tests passed; no invalid canvas draw coordinates; no runtime errors. |
| 2026-11-19 02:15 | Added project rules to the README. | `README.md` | Process documentation only; no code impact. |
| 2026-11-19 02:41 | Added player name entry, region selection, HUD identity, and per-region local best scores. Updated input handling so typing in the profile form does not trigger game controls. | `js/game.js`, `js/render.js`, `js/utils.js`, `css/style.css`, `.test-harness.js` | Profile flow, name normalization, persistence, region selection, and per-region bests verified; full headless suite passed. |
| 2026-11-19 02:48–02:49 | Created, updated, then removed a GitHub Pages `CNAME` file. | `CNAME` | Deployment configuration only; no runtime impact. |
| 2026-11-19 03:09 | Expanded the README into full project documentation and added this change history. No gameplay code changed. | `README.md` | Documentation update only; headless suite still passes; no errors. |
