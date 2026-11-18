/* Main game: state machine, collisions, camera, scoring. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const T = M.TILE;
  const VIEW_W = M.VIEW_W;
  const SOLID = new Set(['#', 'B', '?', 'U', 'S', 'P']);

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;

      this.input = new M.Input(window);
      this.audio = new M.AudioEngine();
      this.overlay = document.getElementById('overlay');
      this.touch = document.getElementById('touch-controls');

      this.state = 'title';
      this.levelIndex = 0;
      this.score = 0;
      this.coins = 0;
      this.lives = 3;
      this.gameTime = 0;
      this.titleT = 0;
      this.timeLeft = 300;
      this.deathDelay = 0;
      this.levelTimer = 0;
      this.introTimer = 0;
      this.completed = false;
      this.flagStarted = false;
      this.shake = 0;
      this.muted = false;
      this.touchHidden = null;

      this.entities = [];
      this.particles = [];
      this.floaters = [];
      this.bumps = [];
      this.camera = { x: 0 };
      this.level = null;
      this.player = null;
      this.decor = { clouds: [], hills: [], bushes: [], crystals: [], stars: [], towers: [] };

      this.frame = this.frame.bind(this);
      this.bindUI();
      this.showTitle();

      this.last = performance.now();
      requestAnimationFrame(this.frame);
    }

    /* ---------------------------- level setup ---------------------------- */

    loadLevel(index) {
      const lv = M.createLevel(index);
      this.level = lv;
      this.levelIndex = index;
      this.timeLeft = lv.time;
      this.flagStarted = false;
      this.completed = false;
      this.deathDelay = 0;
      this.shake = 0;
      this.bumps = [];
      this.particles = [];
      this.floaters = [];

      this.player = new M.Player(lv.spawn.x * T + 4, (lv.spawn.y + 1) * T);

      this.entities = lv.enemies.map((spec) => {
        if (spec.type === 'goomba') {
          return new M.Goomba(spec.x * T + 3, spec.footRow * T);
        }
        if (spec.type === 'koopa') {
          return new M.Koopa(spec.x * T + 3, spec.footRow * T);
        }
        return new M.Piranha(spec.x, spec.pipeH);
      });

      this.camera.x = M.clamp(this.player.x - VIEW_W * 0.35, 0, Math.max(0, lv.width * T - VIEW_W));
      this.decor = this.makeDecor(lv);
    }

    makeDecor(lv) {
      const rng = M.makeRng(lv.width * 7919 + lv.name.charCodeAt(2) * 131);
      const worldW = lv.width * T;
      const clouds = [];
      const hills = [];
      const bushes = [];
      const crystals = [];
      const stars = [];
      const towers = [];

      for (let x = 120; x < worldW + 400; x += 260 + rng() * 320) {
        clouds.push({ x, y: 42 + rng() * 120, s: 0.65 + rng() * 0.8 });
      }
      for (let x = 160; x < worldW + 500; x += 420 + rng() * 380) {
        hills.push({ x, w: 200 + rng() * 260, h: 55 + rng() * 75 });
      }
      for (let x = 80; x < worldW + 300; x += 180 + rng() * 260) {
        bushes.push({ x, s: 0.75 + rng() * 0.75 });
      }
      for (let x = 100; x < worldW + 300; x += 170 + rng() * 260) {
        crystals.push({ x, y: 90 + rng() * 270 });
      }
      for (let i = 0; i < 150; i++) {
        stars.push({ x: rng() * 3200, y: 20 + rng() * 300, size: rng() > 0.75 ? 3 : 2 });
      }
      for (let x = -100; x < 1400; x += 120 + rng() * 200) {
        towers.push({ x, w: 40 + rng() * 70, h: 80 + rng() * 150 });
      }

      return { clouds, hills, bushes, crystals, stars, towers };
    }

    /* ------------------------------ world ------------------------------ */

    tileAt(tx, ty) {
      if (tx < 0 || tx >= this.level.width || ty < 0 || ty >= 15) return ' ';
      return this.level.grid[ty][tx];
    }

    isSolid(tx, ty) {
      if (tx < 0 || tx >= this.level.width) return true;
      if (ty < 0 || ty >= 15) return false;
      return SOLID.has(this.level.grid[ty][tx]);
    }

    brickAt(tx, ty) {
      return this.tileAt(tx, ty) === 'B';
    }

    /* ------------------------------ loop ------------------------------- */

    frame(now) {
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      dt = Math.min(dt, 0.033);

      this.update(dt);
      M.drawGame(this.ctx, this);
      this.input.endFrame();
      requestAnimationFrame(this.frame);
    }

    update(dt) {
      if (this.input.pressed('mute')) {
        this.audio.ensure();
        this.muted = this.audio.toggleMute();
      }

      if (this.state !== 'playing' && this.state !== 'paused' &&
          (this.input.pressed('start') || this.input.pressed('jump'))) {
        if (this.state === 'title') this.startGame();
        else if (this.state === 'levelcomplete') this.nextLevel();
        else if (this.state === 'gameover' || this.state === 'victory') this.startGame();
      }

      switch (this.state) {
        case 'title': {
          this.titleT += dt;
          this.gameTime += dt;
          this.camera.x = (0.5 - 0.5 * Math.cos(this.titleT * 0.12)) *
            Math.max(0, this.level.width * T - VIEW_W);
          break;
        }
        case 'intro': {
          this.gameTime += dt;
          this.introTimer -= dt;
          if (this.introTimer <= 0) {
            this.state = 'playing';
            this.hideOverlay();
            this.audio.startMusic();
          }
          break;
        }
        case 'playing': {
          if (this.input.pressed('pause')) {
            this.togglePause();
            break;
          }
          this.updatePlaying(dt);
          break;
        }
        case 'paused': {
          if (this.input.pressed('pause')) this.togglePause();
          break;
        }
        case 'levelcomplete': {
          this.gameTime += dt;
          this.levelTimer += dt;
          this.updateParticles(dt);
          this.updateFloaters(dt);
          if (this.levelTimer > 6) this.nextLevel();
          break;
        }
        case 'gameover':
        case 'victory': {
          this.gameTime += dt;
          this.updateParticles(dt);
          this.updateFloaters(dt);
          this.shake = Math.max(0, this.shake - dt * 30);
          break;
        }
        default: break;
      }

      this.syncTouch();
    }

    updatePlaying(dt) {
      this.gameTime += dt;
      const p = this.player;

      if (!p.dead) {
        this.timeLeft -= dt * 2;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.killPlayer(true);
        }
      }

      p.update(dt, this);

      this.updateBumps(dt);
      for (const e of this.entities) e.update(dt, this);
      this.entities = this.entities.filter((e) => !e.remove);

      this.updateParticles(dt);
      this.updateFloaters(dt);
      this.shake = Math.max(0, this.shake - dt * 30);

      if (!p.dead) {
        this.collectNearbyCoins();
        this.collectPowerups();
        this.handleEnemyCollisions();
        this.handleFireballs();
        this.handleShells();
        this.checkFlag();
      }

      this.updateCamera(dt);

      if (p.dead) {
        this.deathDelay += dt;
        if (this.deathDelay > 2.6) this.loseLife();
      }
    }

    updateCamera(dt) {
      const maxX = Math.max(0, this.level.width * T - VIEW_W);
      const target = M.clamp(this.player.x + this.player.w / 2 - VIEW_W * 0.42, 0, maxX);
      this.camera.x = M.lerp(this.camera.x, target, Math.min(1, dt * 6));
      if (Math.abs(this.camera.x - target) < 0.3) this.camera.x = target;
    }

    /* --------------------------- interactions --------------------------- */

    updateBumps(dt) {
      for (const b of this.bumps) b.t += dt;
      this.bumps = this.bumps.filter((b) => b.t < b.dur);
    }

    bumpOffset(tx, ty) {
      for (const b of this.bumps) {
        if (b.tx === tx && b.ty === ty) {
          return -Math.sin(Math.PI * (b.t / b.dur)) * 10;
        }
      }
      return 0;
    }

    bumpTile(tx, ty) {
      this.bumps.push({ tx, ty, t: 0, dur: 0.22 });
    }

    hitBlock(tx, ty, player) {
      const ch = this.tileAt(tx, ty);

      if (ch === '?') {
        this.level.grid[ty][tx] = 'U';
        this.bumpTile(tx, ty);
        this.audio.bump();
        const content = this.level.contents[tx + ',' + ty] || 'coin';
        if (content === 'power') {
          this.spawnPowerup(tx, ty, player.big ? 'flower' : 'mushroom');
          this.audio.powerAppear();
        } else {
          this.collectCoin(tx, ty, true);
        }
        return;
      }

      if (ch === 'B') {
        if (player.big) {
          this.level.grid[ty][tx] = ' ';
          this.score += 50;
          this.audio.breakBlock();
          this.shake = Math.max(this.shake, 4);
          const cx = tx * T + T / 2;
          const cy = ty * T + T / 2;
          for (let i = 0; i < 7; i++) {
            this.addParticle(cx + (Math.random() - 0.5) * 24, cy + (Math.random() - 0.5) * 20, {
              vx: (Math.random() - 0.5) * 280,
              vy: -120 - Math.random() * 260,
              life: 0.7,
              size: 5 + Math.random() * 5,
              color: i % 2 ? '#c8641e' : '#8a3f10',
              gravity: 1500
            });
          }
        } else {
          this.bumpTile(tx, ty);
          this.audio.bump();
        }
        return;
      }

      if (SOLID.has(ch)) {
        this.bumpTile(tx, ty);
        this.audio.bump();
      }
    }

    spawnPowerup(tx, ty, variant) {
      this.entities.push(new M.Mushroom(tx * T + 3, ty * T - 26, variant));
    }

    spawnFireball(x, y, dir) {
      this.entities.push(new M.Fireball(x - 7, y - 7, dir));
    }

    fireballCount() {
      let n = 0;
      for (const e of this.entities) if (e.type === 'fireball') n++;
      return n;
    }

    collectNearbyCoins() {
      const p = this.player;
      const x1 = Math.floor(p.x / T);
      const x2 = Math.floor((p.x + p.w) / T);
      const y1 = Math.floor(p.y / T);
      const y2 = Math.floor((p.y + p.h) / T);

      for (let ty = y1; ty <= y2; ty++) {
        for (let tx = x1; tx <= x2; tx++) {
          if (this.tileAt(tx, ty) === 'C') {
            this.level.grid[ty][tx] = ' ';
            this.collectCoin(tx, ty, false);
          }
        }
      }
    }

    collectCoin(tx, ty, fromBlock) {
      this.coins++;
      this.score += 200;
      this.audio.coin();
      this.addFloater(tx * T + T / 2, ty * T + 8, '+200', '#ffe066');

      if (fromBlock) {
        this.addParticle(tx * T + T / 2, ty * T, {
          vx: 0, vy: -250, life: 0.5, size: 12,
          color: '#f7c53a', gravity: 1200, shape: 'circle'
        });
      } else {
        this.burst(tx * T + T / 2, ty * T + T / 2, '#ffe066', 5, { gravity: -40 });
      }

      if (this.coins >= 100) {
        this.coins -= 100;
        this.lives++;
        this.audio.oneUp();
        this.addFloater(this.player.x + this.player.w / 2, this.player.y - 8, '1-UP', '#8ef58e');
      }
    }

    collectPowerups() {
      const p = this.player;
      if (p.dead) return;

      for (const e of this.entities) {
        if (e.type !== 'mushroom' || e.spawnT > 0) continue;
        if (!M.aabb(p.box, e.box)) continue;

        e.remove = true;
        if (e.variant === 'flower') {
          p.setBig(true);
          p.fire = true;
        } else {
          p.setBig(true);
        }
        this.score += 1000;
        this.addFloater(e.x + e.w / 2, e.y - 6, '+1000', '#8ef58e');
        this.audio.powerup();
        this.burst(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 12);
      }
    }

    handleEnemyCollisions() {
      const p = this.player;
      if (p.dead || p.state === 'flag') return;

      for (const e of this.entities) {
        if (!e.isEnemy || e.flipped) continue;
        if (e.type === 'piranha' && e.out < 0.4) continue;
        if (!M.aabb(p.box, e.box)) continue;

        if (e.type === 'piranha') {
          p.hurt(this);
          continue;
        }

        const stomping = p.vy > 0 && p.prevBottom <= e.y + 16;

        if (stomping) {
          if (e.type === 'goomba') {
            e.stomp(this);
            p.bounce(this.input.held('jump'));
          } else if (e.type === 'koopa') {
            if (e.state === 'walk') {
              e.toShell(this);
              p.bounce(this.input.held('jump'));
            } else if (Math.abs(e.vx) > 20) {
              e.vx = 0;
              e.spin = 0;
              this.addScore(200, e.x, e.y);
              p.bounce(this.input.held('jump'));
            } else {
              const dir = (p.x + p.w / 2) < (e.x + e.w / 2) ? 1 : -1;
              e.kick(dir);
              e.x += dir * 5;
              this.audio.stomp();
              this.addScore(200, e.x, e.y);
              p.bounce(this.input.held('jump'));
            }
          }
          continue;
        }

        if (e.type === 'koopa' && e.state === 'shell') {
          if (Math.abs(e.vx) > 20) {
            if (e.noHit > 0) continue;
            p.hurt(this);
          } else {
            const dir = (p.x + p.w / 2) < (e.x + e.w / 2) ? 1 : -1;
            e.kick(dir);
            e.x += dir * 5;
            this.audio.stomp();
            this.addScore(200, e.x, e.y);
          }
          continue;
        }

        p.hurt(this);
      }
    }

    handleFireballs() {
      for (const f of this.entities) {
        if (f.type !== 'fireball') continue;
        for (const e of this.entities) {
          if (e === f || !e.isEnemy || e.flipped) continue;
          if (e.type === 'piranha' && e.out < 0.3) continue;
          if (!M.aabb(f.box, e.box)) continue;

          f.remove = true;
          e.kill(this, Math.sign(f.vx) || 1);
          this.burst(f.x + f.w / 2, f.y + f.h / 2, '#ffb347', 8, { gravity: -80 });
          break;
        }
      }
    }

    handleShells() {
      for (const shell of this.entities) {
        if (shell.type !== 'koopa' || shell.state !== 'shell' || Math.abs(shell.vx) < 50) continue;
        for (const e of this.entities) {
          if (e === shell || !e.isEnemy || e.flipped) continue;
          if (e.type === 'piranha' && e.out < 0.3) continue;
          if (!M.aabb(shell.box, e.box)) continue;
          e.kill(this, Math.sign(shell.vx) || 1);
          this.addScore(100, e.x, e.y);
          this.burst(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 6);
        }
      }
    }

    checkFlag() {
      const p = this.player;
      if (this.flagStarted || p.dead) return;
      if (p.x + p.w > this.level.flagX * T + 6) {
        this.flagStarted = true;
        p.startFlag(this, this.level.flagX * T + 15);
        this.addScore(1000, p.x, p.y);
      }
    }

    killPlayer(timeUp) {
      if (this.player.dead) return;
      this.player.die(this);
      if (timeUp) this.timeLeft = 0;
    }

    /* ------------------------------ scoring ----------------------------- */

    addScore(n, x, y) {
      this.score += n;
      if (typeof x === 'number') {
        this.addFloater(x + 12, y - 4, '+' + n, '#fff3ad');
      }
    }

    addFloater(x, y, text, color) {
      this.floaters.push({ x, y, text, color: color || '#fff3ad', life: 0.9, max: 0.9 });
      if (this.floaters.length > 40) this.floaters.shift();
    }

    addParticle(x, y, opts) {
      const life = opts.life || 0.6;
      this.particles.push({
        x, y,
        vx: opts.vx || 0,
        vy: opts.vy || 0,
        life,
        maxLife: life,
        size: opts.size || 4,
        color: opts.color || '#fff',
        gravity: opts.gravity === undefined ? 900 : opts.gravity,
        shape: opts.shape || 'square'
      });
      if (this.particles.length > 450) this.particles.shift();
    }

    burst(x, y, color, count = 8, opts = {}) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 190;
        this.addParticle(x, y, {
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 60,
          life: 0.35 + Math.random() * 0.35,
          size: 3 + Math.random() * 5,
          color,
          gravity: opts.gravity === undefined ? 700 : opts.gravity,
          shape: Math.random() > 0.5 ? 'circle' : 'square'
        });
      }
    }

    dust(x, y, count = 3) {
      for (let i = 0; i < count; i++) {
        this.addParticle(x + (Math.random() - 0.5) * 14, y - 2, {
          vx: (Math.random() - 0.5) * 90,
          vy: -30 - Math.random() * 60,
          life: 0.35,
          size: 4 + Math.random() * 3,
          color: 'rgba(255,255,255,0.7)',
          gravity: 100
        });
      }
    }

    updateParticles(dt) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    updateFloaters(dt) {
      for (const f of this.floaters) {
        f.life -= dt;
        f.y -= 48 * dt;
      }
      this.floaters = this.floaters.filter((f) => f.life > 0);
    }

    /* ------------------------------ flow -------------------------------- */

    startGame() {
      this.audio.ensure();
      this.audio.setMuted(this.muted);
      this.score = 0;
      this.coins = 0;
      this.lives = 3;
      this.gameTime = 0;
      this.levelIndex = 0;
      this.loadLevel(0);
      this.state = 'intro';
      this.introTimer = 1.6;
      this.showLevelCard();
      this.blurButtons();
      this.syncTouch();
    }

    loseLife() {
      this.lives--;
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.audio.gameOver();
        this.audio.stopMusic();
        this.saveBest();
        this.showGameOver();
      } else {
        this.loadLevel(this.levelIndex);
        this.state = 'intro';
        this.introTimer = 1.4;
        this.showLevelCard();
      }
      this.syncTouch();
    }

    completeLevel() {
      if (this.completed) return;
      this.completed = true;
      const bonus = Math.max(0, Math.ceil(this.timeLeft)) * 10;
      this.score += bonus;
      this.audio.clear();
      this.audio.stopMusic();
      this.saveBest();
      this.state = 'levelcomplete';
      this.levelTimer = 0;
      this.showLevelComplete(bonus);
      this.syncTouch();
    }

    nextLevel() {
      if (this.levelIndex + 1 >= M.LEVEL_COUNT) {
        this.victory();
        return;
      }
      this.loadLevel(this.levelIndex + 1);
      this.state = 'intro';
      this.introTimer = 1.5;
      this.showLevelCard();
      this.blurButtons();
      this.syncTouch();
    }

    victory() {
      this.state = 'victory';
      this.audio.stopMusic();
      this.audio.clear();
      this.saveBest();
      this.showVictory();
      this.syncTouch();
    }

    togglePause() {
      if (this.state === 'playing' && !this.player.dead) {
        this.state = 'paused';
        this.audio.stopMusic();
        this.showPause();
      } else if (this.state === 'paused') {
        this.state = 'playing';
        this.hideOverlay();
        this.audio.startMusic();
      }
      this.syncTouch();
    }

    showTitle() {
      this.state = 'title';
      this.gameTime = 0;
      this.titleT = 0;
      this.audio.stopMusic();
      this.loadLevel(0);
      this.score = 0;
      this.coins = 0;
      this.lives = 3;

      const best = this.loadBest();
      this.showOverlay(`
        <div class="panel title-panel">
          <p class="eyebrow">A FAN-MADE BROWSER TRIBUTE</p>
          <h1 class="logo"><span>SUPER</span>MARIO</h1>
          <p class="logo-sub">PIXEL ADVENTURE</p>
          <button class="btn primary" data-action="start">▶ START GAME</button>
          <div class="controls-grid">
            <div><kbd>←</kbd><kbd>→</kbd><span>Move</span></div>
            <div><kbd>SPACE</kbd><span>Jump</span></div>
            <div><kbd>SHIFT</kbd><span>Run</span></div>
            <div><kbd>X</kbd><span>Fireball</span></div>
            <div><kbd>P</kbd><span>Pause</span></div>
            <div><kbd>M</kbd><span>Mute</span></div>
          </div>
          <p class="best">BEST ${M.fmtScore(best)}</p>
        </div>
      `);
      this.syncTouch();
    }

    showLevelCard() {
      const lv = this.level;
      this.showOverlay(`
        <div class="panel level-card passive">
          <p class="world-label">WORLD</p>
          <h2>${lv.name}</h2>
          <p class="lives-line">MARIO × ${this.lives}</p>
        </div>
      `, { passive: true });
    }

    showPause() {
      this.showOverlay(`
        <div class="panel">
          <h2>PAUSED</h2>
          <div class="btn-column">
            <button class="btn primary" data-action="resume">RESUME</button>
            <button class="btn" data-action="restart">RESTART GAME</button>
            <button class="btn ghost" data-action="menu">TITLE SCREEN</button>
          </div>
          <p class="tiny">Press P to continue</p>
        </div>
      `);
    }

    showLevelComplete(bonus) {
      const last = this.levelIndex + 1 >= M.LEVEL_COUNT;
      this.showOverlay(`
        <div class="panel">
          <h2 class="win">LEVEL CLEAR!</h2>
          <p class="scoreline">TIME BONUS <strong>+${bonus}</strong></p>
          <p class="scoreline">SCORE <strong>${M.fmtScore(this.score)}</strong></p>
          <button class="btn primary" data-action="next">${last ? 'FINISH' : 'NEXT LEVEL'} ▶</button>
          <p class="tiny">${last ? 'One more world to go...' : 'Continuing automatically...'}</p>
        </div>
      `);
    }

    showGameOver() {
      this.showOverlay(`
        <div class="panel">
          <h2 class="warn">GAME OVER</h2>
          <p class="scoreline">FINAL SCORE <strong>${M.fmtScore(this.score)}</strong></p>
          <p class="scoreline">COINS <strong>${this.coins}</strong></p>
          <button class="btn primary" data-action="restart">PLAY AGAIN</button>
          <p class="tiny">Press Enter to retry</p>
        </div>
      `);
    }

    showVictory() {
      this.showOverlay(`
        <div class="panel">
          <p class="eyebrow">ALL WORLDS CLEAR</p>
          <h2 class="win">YOU SAVED THE KINGDOM!</h2>
          <p class="scoreline">FINAL SCORE <strong>${M.fmtScore(this.score)}</strong></p>
          <p class="scoreline">BEST <strong>${M.fmtScore(this.loadBest())}</strong></p>
          <button class="btn primary" data-action="restart">PLAY AGAIN</button>
          <p class="tiny">Thanks for playing!</p>
        </div>
      `);
    }

    /* ---------------------------- overlay UI ---------------------------- */

    showOverlay(html, opts = {}) {
      this.overlay.innerHTML = html;
      this.overlay.classList.remove('hidden');
      this.overlay.classList.toggle('passive', !!opts.passive);
    }

    hideOverlay() {
      this.overlay.classList.add('hidden');
      this.overlay.classList.remove('passive');
      this.overlay.innerHTML = '';
    }

    blurButtons() {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    }

    bindUI() {
      this.overlay.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.preventDefault();
        this.audio.ensure();
        const action = btn.dataset.action;
        this.blurButtons();

        if (action === 'start' || action === 'restart') this.startGame();
        else if (action === 'resume') this.togglePause();
        else if (action === 'next') this.nextLevel();
        else if (action === 'menu') this.showTitle();
      });

      if (this.touch) {
        for (const btn of this.touch.querySelectorAll('[data-key]')) {
          const key = btn.dataset.key;
          const press = (e) => {
            e.preventDefault();
            this.audio.ensure();
            btn.classList.add('active');
            this.input.setVirtual(key, true);
          };
          const release = (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            this.input.setVirtual(key, false);
          };
          btn.addEventListener('pointerdown', press);
          btn.addEventListener('pointerup', release);
          btn.addEventListener('pointercancel', release);
          btn.addEventListener('pointerleave', release);
          btn.addEventListener('contextmenu', (e) => e.preventDefault());
        }
      }

      window.addEventListener('blur', () => {
        if (this.state === 'playing' && !this.player.dead) this.togglePause();
      });
    }

    syncTouch() {
      if (!this.touch) return;
      const hidden = this.state !== 'playing';
      if (hidden !== this.touchHidden) {
        this.touchHidden = hidden;
        this.touch.classList.toggle('hidden', hidden);
      }
    }

    loadBest() {
      try {
        return parseInt(localStorage.getItem('mario-browser-best') || '0', 10) || 0;
      } catch (err) {
        return 0;
      }
    }

    saveBest() {
      try {
        if (this.score > this.loadBest()) {
          localStorage.setItem('mario-browser-best', String(Math.floor(this.score)));
        }
      } catch (err) { /* ignore */ }
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game');
    if (canvas) window.game = new Game(canvas);
  });
})(window.M);
