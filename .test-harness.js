/* Temporary headless logic test for the game. */
const fs = require('fs');
const vm = require('vm');

let now = 0;
const gradient = { addColorStop() {} };
const badDraws = [];
const ctx = new Proxy({}, {
  get(t, p) {
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => gradient;
    if (p === 'measureText') return () => ({ width: 10 });
    if (!(p in t)) t[p] = (...args) => {
      for (const a of args) {
        if (typeof a === 'number' && !Number.isFinite(a)) {
          if (badDraws.length < 20) badDraws.push({ method: String(p), args: args.slice(0, 8) });
        }
      }
    };
    return t[p];
  },
  set(t, p, v) { t[p] = v; return true; }
});

class FakeEl {
  constructor(name) {
    this.name = name;
    this.innerHTML = '';
    this.dataset = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    this.handlers = {};
  }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  getContext() { return ctx; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  closest() { return null; }
  blur() {}
}

const canvas = new FakeEl('canvas');
canvas.width = 960;
canvas.height = 480;
const overlay = new FakeEl('overlay');
const touch = new FakeEl('touch');

const listeners = {};
const windowObj = {};
const sandbox = {
  window: windowObj,
  document: {
    getElementById(id) {
      if (id === 'game') return canvas;
      if (id === 'overlay') return overlay;
      if (id === 'touch-controls') return touch;
      return null;
    },
    activeElement: { blur() {} },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }
  },
  localStorage: {
    _data: new Map(),
    getItem(k) { return this._data.has(k) ? this._data.get(k) : null; },
    setItem(k, v) { this._data.set(k, String(v)); }
  },
  performance: { now: () => now },
  requestAnimationFrame() {},
  console,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  isFinite
};
sandbox.globalThis = sandbox;
windowObj.window = windowObj;
windowObj.document = sandbox.document;
windowObj.localStorage = sandbox.localStorage;
windowObj.performance = sandbox.performance;
windowObj.requestAnimationFrame = sandbox.requestAnimationFrame;
windowObj.console = console;
windowObj.Math = Math;
windowObj.setTimeout = setTimeout;
windowObj.clearTimeout = clearTimeout;
windowObj.setInterval = setInterval;
windowObj.clearInterval = clearInterval;
windowObj.isFinite = isFinite;
windowObj.addEventListener = (type, fn) => { (listeners[type] ||= []).push(fn); };

const code = ['js/utils.js', 'js/levels.js', 'js/audio.js', 'js/entities.js', 'js/player.js', 'js/render.js', 'js/game.js']
  .map((f) => fs.readFileSync(f, 'utf8')).join('\n;\n');

vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'game-bundle.js' });

for (const fn of listeners.DOMContentLoaded || []) fn();
const game = windowObj.game;
if (!game) throw new Error('Game did not initialize');

const profileName = { value: '', focus() {}, select() {} };
const profileRegion = { value: 'na' };
overlay.querySelector = (sel) => {
  if (sel === '#player-name') return profileName;
  if (sel === '#player-region') return profileRegion;
  return null;
};

function step(seconds, fn) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) {
    if (fn) fn(i);
    now += 1000 / 60;
    game.update(1 / 60);
    sandbox.window.M.drawGame(ctx, game);
    game.input.endFrame();
  }
}

function check(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { console.error('FAIL', name, extra === undefined ? '' : extra); process.exitCode = 1; }
}

check('title state', game.state === 'title', game.state);
check('level loaded', game.level && game.level.name === '1-1');

game.startGame();
step(2.0);
check('playing after intro', game.state === 'playing', game.state);
step(0.4);
check('player grounded', game.player.onGround, { y: game.player.y, vy: game.player.vy });

const groundY = game.player.y;
game.input.setVirtual('jump', true);
step(0.15);
game.input.setVirtual('jump', false);
check('jump lifts player', game.player.y < groundY - 20, { y: game.player.y, groundY });
step(1.2);
check('lands after jump', game.player.onGround, { y: game.player.y, vy: game.player.vy });

const startX = game.player.x;
game.input.setVirtual('right', true);
game.input.setVirtual('run', true);
step(1.2);
game.input.setVirtual('right', false);
game.input.setVirtual('run', false);
check('runs right', game.player.x > startX + 150, game.player.x - startX);

game.loadLevel(0);
game.state = 'playing';
const p = game.player;
p.invuln = 999;
p.x = 16 * 32 + 5;
p.y = 11 * 32;
p.vx = 0; p.vy = 0;
game.camera.x = Math.max(0, p.x - 300);
step(0.05);
game.input.setVirtual('jump', true);
step(0.45);
game.input.setVirtual('jump', false);
const qTile = game.level.grid[9][16];
check('question block becomes used', qTile === 'U', qTile);
check('block spawns powerup', game.entities.some((e) => e.type === 'mushroom'), game.entities.map((e) => e.type).join(','));
step(2);

const mush = game.entities.find((e) => e.type === 'mushroom');
if (mush) {
  mush.x = game.player.x;
  mush.y = game.player.y;
  step(0.1);
}
check('player grows from mushroom', game.player.big === true, { big: game.player.big, h: game.player.h });

const beforeCoins = game.coins;
const coinCol = Math.floor(game.player.x / 32);
const coinRow = Math.floor((game.player.y + 10) / 32);
game.level.grid[coinRow][coinCol] = 'C';
step(0.1);
check('collects coin tile', game.coins > beforeCoins, { coins: game.coins, before: beforeCoins });

const goomba = new sandbox.window.M.Goomba(game.player.x + 20, 13 * 32);
game.entities.push(goomba);
game.player.x = goomba.x + 2;
game.player.y = goomba.y - 80;
game.player.vy = 500;
game.player.prevBottom = game.player.y + game.player.h;
const scoreBefore = game.score;
step(0.5);
check('stomps goomba', goomba.squash > 0 || goomba.remove, { squash: goomba.squash, remove: goomba.remove });
check('stomp awards score', game.score > scoreBefore, game.score - scoreBefore);

game.player.fire = true;
game.player.big = true;
game.player.fireCooldown = 0;
game.input.setVirtual('fire', true);
step(0.05);
game.input.setVirtual('fire', false);
check('fires fireball', game.entities.some((e) => e.type === 'fireball'), game.entities.map((e) => e.type).join(','));
step(1.5);

check('piranha present', game.entities.some((e) => e.type === 'piranha'));

const flagPole = game.level.flagX * 32 + 15;
game.player.x = flagPole - 10;
game.player.y = 12 * 32;
game.player.vy = 0;
game.flagStarted = false;
step(0.1);
check('flag sequence starts', game.player.state === 'flag', game.player.state);
step(3.2);
check('level completes', game.state === 'levelcomplete', game.state);
check('score after clear', game.score > 0);

game.nextLevel();
step(2);
check('advances to 1-2', game.level.name === '1-2', game.level.name);
check('second level playing', game.state === 'playing', game.state);

const livesBefore = game.lives;
game.player.y = 700;
step(0.1);
check('pit kills player', game.player.dead === true);
step(3.2);
check('life lost on death', game.lives === livesBefore - 1, { before: livesBefore, after: game.lives });
check('level reloads after death', game.level.name === '1-2', game.level.name);
step(2);

game.lives = 1;
game.player.y = 700;
step(0.1);
step(3.2);
check('game over at zero lives', game.state === 'gameover', game.state);

game.startGame();
step(2);
check('restart resets to 1-1', game.level.name === '1-1' && game.lives === 3, { level: game.level.name, lives: game.lives });
check('restart is playing', game.state === 'playing', game.state);

game.input.setVirtual('right', true);
game.input.setVirtual('run', true);
step(14, (i) => {
  if (i % 42 === 0) game.input.setVirtual('jump', true);
  if (i % 42 === 12) game.input.setVirtual('jump', false);
  if (i % 53 === 0) game.input.setVirtual('fire', true);
  if (i % 53 === 4) game.input.setVirtual('fire', false);
});
game.input.setVirtual('right', false);
game.input.setVirtual('run', false);
console.log('SOAK RESULT', JSON.stringify({
  state: game.state,
  level: game.level.name,
  x: Math.round(game.player.x),
  score: game.score,
  coins: game.coins,
  lives: game.lives,
  entities: game.entities.length,
  particles: game.particles.length
}));
check('soak run has no crash state', ['playing', 'levelcomplete', 'gameover', 'intro', 'paused', 'victory'].includes(game.state));

console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED');

// ---------------- traversal check for each level ----------------
for (let li = 0; li < 3; li++) {
  game.loadLevel(li);
  game.state = 'playing';
  game.player.invuln = 99999;
  game.lives = 99;
  const lvName = game.level.name;
  const flagX = game.level.flagX * 32;
  let maxX = 0;
  let reached = false;
  let lastX = -1;
  let stuckFrames = 0;

  game.input.setVirtual('right', true);
  game.input.setVirtual('run', true);

  for (let i = 0; i < 9000; i++) {
    const p = game.player;
    maxX = Math.max(maxX, p.x);

    if (Math.abs(p.x - lastX) < 0.6) stuckFrames++;
    else stuckFrames = 0;
    lastX = p.x;

    const front = Math.floor((p.x + p.w + 6) / 32);
    const feetRow = Math.floor((p.y + p.h - 4) / 32);
    let pitAhead = false;
    for (let d = 1; d <= 2; d++) {
      if (!game.isSolid(front + d, 13) && !game.isSolid(front + d, 14)) pitAhead = true;
    }
    const wallAhead = game.isSolid(front, feetRow) || game.isSolid(front, feetRow - 1);
    const shouldJump = p.onGround && (pitAhead || wallAhead || stuckFrames > 10);

    if (shouldJump) {
      game.input.setVirtual('jump', false);
      game.input.setVirtual('jump', true);
      stuckFrames = 0;
    } else {
      game.input.setVirtual('jump', p.onGround ? false : game.input.held('jump'));
    }

    now += 1000 / 60;
    game.update(1 / 60);
    sandbox.window.M.drawGame(ctx, game);
    game.input.endFrame();

    if (game.state === 'levelcomplete' || game.player.state === 'flag' || game.player.x >= flagX - 40) {
      reached = true;
      break;
    }
    if (game.level.name !== lvName || game.state === 'gameover') break;
  }

  game.input.setVirtual('right', false);
  game.input.setVirtual('run', false);
  game.input.setVirtual('jump', false);
  console.log('TRAVERSAL', lvName, JSON.stringify({
    maxTile: Math.round(maxX / 32), flagTile: Math.round(flagX / 32),
    reached, state: game.state
  }));
  check('level ' + lvName + ' traversable', reached, { maxTile: Math.round(maxX / 32), flagTile: Math.round(flagX / 32) });
}
console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED');

console.log('BAD DRAW CALLS', badDraws.length, JSON.stringify(badDraws, null, 2));
check('no non-finite draw coordinates', badDraws.length === 0);
console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED');

// ---------------- profile / region ----------------
game.showTitle();
game.showProfile();
check('profile screen opens', game.state === 'profile', game.state);
check('profile form rendered', overlay.innerHTML.includes('profile-form'));
profileName.value = '  luigi  ';
profileRegion.value = 'eu';
game.submitProfile();
check('name normalized', game.playerName === 'LUIGI', game.playerName);
check('region selected', game.region.id === 'eu', game.region.id);
check('profile starts game', game.state === 'intro', game.state);
const storedProfile = JSON.parse(sandbox.localStorage.getItem('mario-browser-profile') || '{}');
check('profile persisted', storedProfile.name === 'LUIGI' && storedProfile.regionId === 'eu', storedProfile);
game.score = 1234;
game.saveBest();
check('region best saved', game.loadBest() === 1234 && sandbox.localStorage.getItem('mario-browser-best-eu') === '1234', game.loadBest());
check('empty name fallback', game.cleanName('   ') === 'MARIO');
check('name max length', game.cleanName('abcdefghijklmnop').length === 12);
check('name strips angle brackets', !game.cleanName('<b>BOB</b>').includes('<'));
console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED');
