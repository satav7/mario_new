/* Enemies, power-ups and fireballs. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const T = M.TILE;

  function moveEntity(e, game, dt, opts = {}) {
    e.vy = Math.min(e.vy + (e.gravity || 2200) * dt, 1000);

    // --- horizontal ---
    e.x += e.vx * dt;
    const top = Math.floor((e.y + 2) / T);
    const bottom = Math.floor((e.y + e.h - 2) / T);

    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w) / T);
      for (let ty = top; ty <= bottom; ty++) {
        if (game.isSolid(tx, ty)) {
          e.x = tx * T - e.w - 0.01;
          if (opts.turnOnWall !== false) {
            e.vx = -Math.abs(e.vx);
            e.dir = -1;
          } else {
            e.vx = 0;
          }
          break;
        }
      }
    } else if (e.vx < 0) {
      const tx = Math.floor(e.x / T);
      for (let ty = top; ty <= bottom; ty++) {
        if (game.isSolid(tx, ty)) {
          e.x = (tx + 1) * T + 0.01;
          if (opts.turnOnWall !== false) {
            e.vx = Math.abs(e.vx);
            e.dir = 1;
          } else {
            e.vx = 0;
          }
          break;
        }
      }
    }

    // --- vertical ---
    e.onGround = false;
    e.y += e.vy * dt;

    if (e.vy > 0) {
      const ty = Math.floor((e.y + e.h) / T);
      const left = Math.floor((e.x + 3) / T);
      const right = Math.floor((e.x + e.w - 3) / T);
      for (let tx = left; tx <= right; tx++) {
        if (game.isSolid(tx, ty)) {
          e.y = ty * T - e.h;
          e.vy = 0;
          e.onGround = true;
          break;
        }
      }
    } else if (e.vy < 0) {
      const ty = Math.floor(e.y / T);
      const left = Math.floor((e.x + 3) / T);
      const right = Math.floor((e.x + e.w - 3) / T);
      for (let tx = left; tx <= right; tx++) {
        if (game.isSolid(tx, ty)) {
          e.y = (ty + 1) * T + 0.01;
          e.vy = 0;
          break;
        }
      }
    }

    if (e.x < 0) {
      e.x = 0;
      e.vx = Math.abs(e.vx);
    }

    if (e.y > 700) e.remove = true;
  }

  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.remove = false;
      this.isEnemy = false;
      this.flipped = false;
    }

    get box() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    update() {}
  }

  /* ------------------------------- Goomba ------------------------------- */
  class Goomba extends Entity {
    constructor(x, feetY) {
      super(x, feetY - 26, 26, 26);
      this.type = 'goomba';
      this.isEnemy = true;
      this.vx = -48;
      this.gravity = 2200;
      this.squash = 0;
      this.anim = 0;
    }

    update(dt, game) {
      if (this.squash > 0) {
        this.squash -= dt;
        if (this.squash <= 0) this.remove = true;
        return;
      }
      if (this.flipped) {
        this.vy += 1900 * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        if (this.y > 620) this.remove = true;
        return;
      }
      moveEntity(this, game, dt);
      this.anim += dt * 7;
    }

    stomp(game) {
      this.squash = 0.45;
      this.isEnemy = false;
      game.addScore(100, this.x, this.y);
      game.audio.stomp();
      game.shake = Math.max(game.shake, 3);
    }

    kill(game, dir = 1) {
      if (this.flipped) return;
      this.flipped = true;
      this.isEnemy = false;
      this.vy = -430;
      this.vx = 70 * dir;
      game.addScore(100, this.x, this.y);
      game.audio.stomp();
    }
  }

  /* ------------------------------- Koopa -------------------------------- */
  class Koopa extends Entity {
    constructor(x, feetY) {
      super(x, feetY - 40, 26, 40);
      this.type = 'koopa';
      this.isEnemy = true;
      this.state = 'walk';
      this.vx = -46;
      this.gravity = 2200;
      this.anim = 0;
      this.spin = 0;
      this.noHit = 0;
    }

    update(dt, game) {
      if (this.noHit > 0) this.noHit -= dt;

      if (this.flipped) {
        this.vy += 1900 * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.spin += dt * 10;
        if (this.y > 620) this.remove = true;
        return;
      }

      if (this.state === 'walk') {
        moveEntity(this, game, dt);
        this.anim += dt * 5;
      } else {
        this.spin += dt * (Math.abs(this.vx) > 10 ? 14 : 1.5);
        if (Math.abs(this.vx) > 10) {
          moveEntity(this, game, dt, { turnOnWall: false });
          if (this.vx === 0) this.spin = 0;
        }
      }
    }

    toShell(game) {
      const feet = this.y + this.h;
      this.state = 'shell';
      this.h = 26;
      this.y = feet - this.h;
      this.vx = 0;
      this.w = 28;
      this.x -= 1;
      game.addScore(100, this.x, this.y);
      game.audio.stomp();
      game.shake = Math.max(game.shake, 3);
    }

    kick(direction) {
      this.state = 'shell';
      this.vx = direction * 420;
      this.noHit = 0.18;
      this.spin = 0;
    }

    kill(game, dir = 1) {
      if (this.flipped) return;
      this.flipped = true;
      this.isEnemy = false;
      this.state = 'shell';
      this.h = 26;
      this.vy = -430;
      this.vx = 70 * dir;
      game.addScore(200, this.x, this.y);
      game.audio.stomp();
    }
  }

  /* ------------------------------ Piranha ------------------------------- */
  class Piranha extends Entity {
    constructor(tx, pipeH) {
      const x = tx * T - 13;
      const pipeTop = (13 - pipeH) * T;
      super(x, pipeTop + 8, 26, 30);
      this.type = 'piranha';
      this.isEnemy = true;
      this.baseY = pipeTop + 8;
      this.t = Math.random() * 2;
      this.out = 0;
      this.anim = 0;
    }

    update(dt) {
      if (this.flipped) {
        this.vy += 1600 * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        if (this.y > 620) this.remove = true;
        return;
      }
      this.t += dt;
      this.anim += dt * 4;
      const cycle = 4.6;
      const p = this.t % cycle;
      if (p < 0.8) this.out = 0;
      else if (p < 1.7) this.out = (p - 0.8) / 0.9;
      else if (p < 2.6) this.out = 1;
      else if (p < 3.5) this.out = 1 - (p - 2.6) / 0.9;
      else this.out = 0;
      this.y = this.baseY - this.out * 56;
    }

    kill(game) {
      if (this.flipped) return;
      this.flipped = true;
      this.isEnemy = false;
      this.vy = -260;
      this.vx = 40;
      game.addScore(200, this.x, this.y);
      game.audio.stomp();
      game.burst(this.x + this.w / 2, this.y + this.h / 2, '#ff6b6b', 8);
    }

    get box() {
      return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
    }
  }

  /* ------------------------------ Mushroom ------------------------------ */
  class Mushroom extends Entity {
    constructor(x, y, variant) {
      super(x, y, 26, 26);
      this.type = 'mushroom';
      this.variant = variant || 'mushroom';
      this.vx = 0;
      this.gravity = 2200;
      this.spawnT = 0.35;
      this.startY = y;
      this.y = y + 10;
      this.anim = 0;
    }

    update(dt, game) {
      this.anim += dt * 5;
      if (this.spawnT > 0) {
        this.spawnT -= dt;
        this.y = M.lerp(this.y, this.startY, Math.min(1, dt * 14));
        if (this.spawnT <= 0) {
          this.y = this.startY;
          this.vx = this.variant === 'flower' ? 0 : 90;
        }
        return;
      }
      if (this.variant === 'flower') {
        this.y = this.startY + Math.sin(this.anim * 1.4) * 3;
        return;
      }
      moveEntity(this, game, dt);
      if (this.vx === 0) this.vx = 90;
    }
  }

  /* ------------------------------- Fireball ----------------------------- */
  class Fireball extends Entity {
    constructor(x, y, dir) {
      super(x, y, 14, 14);
      this.type = 'fireball';
      this.vx = dir * 430;
      this.vy = 60;
      this.life = 2.4;
      this.spin = 0;
      this.trail = 0;
    }

    update(dt, game) {
      this.life -= dt;
      this.spin += dt * 22;
      if (this.life <= 0) {
        this.remove = true;
        return;
      }

      this.vy = Math.min(this.vy + 1900 * dt, 800);
      this.x += this.vx * dt;

      // wall check
      const leadingX = this.vx > 0 ? this.x + this.w : this.x;
      const tx = Math.floor(leadingX / T);
      const ty = Math.floor((this.y + this.h / 2) / T);
      if (game.isSolid(tx, ty)) {
        this.remove = true;
        game.burst(this.x + this.w / 2, this.y + this.h / 2, '#ffb347', 6);
        return;
      }

      this.y += this.vy * dt;
      if (this.vy > 0) {
        const groundY = Math.floor((this.y + this.h) / T);
        const cx = Math.floor((this.x + this.w / 2) / T);
        if (game.isSolid(cx, groundY)) {
          this.y = groundY * T - this.h;
          this.vy = -390;
        }
      }

      if (this.y > 620) this.remove = true;

      this.trail -= dt;
      if (this.trail <= 0) {
        this.trail = 0.04;
        game.addParticle(this.x + this.w / 2, this.y + this.h / 2, {
          vx: -this.vx * 0.15,
          vy: -20 + Math.random() * 40,
          life: 0.28,
          size: 4 + Math.random() * 3,
          color: Math.random() > 0.5 ? '#ffd166' : '#ff7b00',
          gravity: -60
        });
      }
    }
  }

  M.moveEntity = moveEntity;
  M.Goomba = Goomba;
  M.Koopa = Koopa;
  M.Piranha = Piranha;
  M.Mushroom = Mushroom;
  M.Fireball = Fireball;
})(window.M);
