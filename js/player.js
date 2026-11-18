/* Mario himself. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const T = M.TILE;
  const GROUND_Y = 13 * T;

  class Player {
    constructor(x, feetY) {
      this.w = 22;
      this.h = 30;
      this.x = x;
      this.y = feetY - this.h;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.big = false;
      this.fire = false;
      this.invuln = 0;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumping = false;
      this.walkTime = 0;
      this.state = 'normal';
      this.dead = false;
      this.deathTimer = 0;
      this.fireCooldown = 0;
      this.prevBottom = this.y + this.h;
      this.skidding = false;
      this.flagProgress = 0;
      this.flagPhase = 'slide';
      this.flagTimer = 0;
    }

    get box() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    setBig(big) {
      if (big === this.big) return;
      const feet = this.y + this.h;
      this.big = big;
      this.h = big ? 52 : 30;
      this.y = feet - this.h;
    }

    bounce(high = false) {
      this.vy = high ? -640 : -520;
      this.jumping = true;
      this.onGround = false;
    }

    update(dt, game) {
      if (this.dead) {
        this.deathTimer += dt;
        this.vy += 1700 * dt;
        this.y += this.vy * dt;
        return;
      }

      if (this.state === 'flag') {
        this.updateFlag(dt, game);
        return;
      }

      if (this.invuln > 0) this.invuln -= dt;
      if (this.fireCooldown > 0) this.fireCooldown -= dt;

      const input = game.input;

      // ---------------- horizontal movement ----------------
      const running = input.held('run');
      const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
      const maxSpeed = running ? 300 : 180;
      const accel = this.onGround ? 2000 : 1300;

      this.skidding = false;
      if (dir !== 0) {
        this.facing = dir;
        if (this.vx !== 0 && Math.sign(this.vx) !== dir) {
          this.vx += dir * accel * 1.8 * dt;
          if (this.onGround) this.skidding = true;
        } else {
          this.vx += dir * accel * dt;
        }
      } else if (this.onGround) {
        this.vx = M.approach(this.vx, 0, 2300 * dt);
      }

      if (Math.abs(this.vx) > maxSpeed) {
        this.vx = M.approach(this.vx, Math.sign(this.vx) * maxSpeed, 1500 * dt);
      }

      // ---------------- jumping ----------------
      if (this.onGround) this.coyote = 0.09;
      else this.coyote = Math.max(0, this.coyote - dt);

      if (input.pressed('jump')) this.jumpBuffer = 0.12;
      else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = -830;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.jumping = true;
        game.audio.jump();
        game.dust(this.x + this.w / 2, this.y + this.h, 3);
      }

      if (this.jumping && !input.held('jump') && this.vy < -270) {
        this.vy = -270;
      }
      if (this.vy >= 0) this.jumping = false;

      // ---------------- gravity ----------------
      this.vy = Math.min(this.vy + (this.vy > 0 ? 2550 : 2400) * dt, 1000);

      // ---------------- move & collide ----------------
      this.prevBottom = this.y + this.h;

      this.x += this.vx * dt;
      this.collideX(game);

      this.y += this.vy * dt;
      this.collideY(game);

      this.x = M.clamp(this.x, 0, game.level.width * T - this.w);

      if (this.onGround) this.walkTime += dt * Math.min(1.6, 0.35 + Math.abs(this.vx) / 220);
      else this.walkTime += dt * 0.35;

      // ---------------- fire ----------------
      if (this.fire && input.pressed('fire') && this.fireCooldown <= 0 && game.fireballCount() < 2) {
        this.fireCooldown = 0.3;
        game.spawnFireball(
          this.x + this.w / 2 + this.facing * 8,
          this.y + (this.big ? 20 : 12),
          this.facing
        );
        game.audio.fireball();
      }

      // ---------------- pit death ----------------
      if (this.y > 520) {
        game.killPlayer(true);
      }
    }

    collideX(game) {
      const y1 = Math.floor((this.y + 4) / T);
      const y2 = Math.floor((this.y + this.h - 4) / T);

      if (this.vx > 0) {
        const tx = Math.floor((this.x + this.w) / T);
        for (let ty = y1; ty <= y2; ty++) {
          if (game.isSolid(tx, ty)) {
            this.x = tx * T - this.w - 0.01;
            this.vx = 0;
            break;
          }
        }
      } else if (this.vx < 0) {
        const tx = Math.floor(this.x / T);
        for (let ty = y1; ty <= y2; ty++) {
          if (game.isSolid(tx, ty)) {
            this.x = (tx + 1) * T + 0.01;
            this.vx = 0;
            break;
          }
        }
      }
    }

    collideY(game) {
      this.onGround = false;

      if (this.vy > 0) {
        const ty = Math.floor((this.y + this.h) / T);
        const x1 = Math.floor((this.x + 4) / T);
        const x2 = Math.floor((this.x + this.w - 4) / T);

        for (let tx = x1; tx <= x2; tx++) {
          if (game.isSolid(tx, ty)) {
            this.y = ty * T - this.h;
            this.vy = 0;
            this.onGround = true;
            this.jumping = false;
            break;
          }
        }
      } else if (this.vy < 0) {
        const ty = Math.floor(this.y / T);
        const x1 = Math.floor((this.x + 4) / T);
        const x2 = Math.floor((this.x + this.w - 4) / T);
        const center = this.x + this.w / 2;

        let hit = null;
        for (let tx = x1; tx <= x2; tx++) {
          if (game.isSolid(tx, ty)) {
            if (!hit || Math.abs(tx * T + T / 2 - center) < Math.abs(hit * T + T / 2 - center)) {
              hit = tx;
            }
          }
        }

        if (hit !== null) {
          this.y = (ty + 1) * T + 0.01;
          this.vy = 0;
          game.hitBlock(hit, ty, this);
        }
      }
    }

    hurt(game) {
      if (this.invuln > 0 || this.dead || this.state === 'flag') return;
      if (this.big) {
        this.setBig(false);
        this.fire = false;
        this.invuln = 2;
        game.audio.hurt();
        game.shake = 8;
        game.burst(this.x + this.w / 2, this.y + this.h / 2, '#ffffff', 10);
      } else {
        this.die(game);
      }
    }

    die(game) {
      if (this.dead) return;
      this.dead = true;
      this.deathTimer = 0;
      this.vy = -640;
      this.vx = 0;
      game.audio.die();
      game.audio.stopMusic();
      game.shake = 6;
    }

    startFlag(game, poleCenterX) {
      if (this.state === 'flag') return;
      this.state = 'flag';
      this.flagPhase = 'slide';
      this.flagTimer = 0;
      this.flagProgress = 0;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.x = poleCenterX - this.w / 2 - 2;
      game.audio.flag();
    }

    updateFlag(dt, game) {
      this.flagTimer += dt;

      if (this.flagPhase === 'slide') {
        this.y += 145 * dt;
        const span = GROUND_Y - 96;
        this.flagProgress = M.clamp((this.y + this.h - 96) / Math.max(1, span), 0, 1);
        if (this.y + this.h >= GROUND_Y) {
          this.y = GROUND_Y - this.h;
          this.flagPhase = 'walk';
          this.flagTimer = 0;
          this.walkTime = 0;
        }
      } else {
        this.vx = 95;
        this.x += this.vx * dt;
        this.walkTime += dt * 1.2;
        this.y = GROUND_Y - this.h;
        if (this.flagTimer > 1.6) game.completeLevel();
      }
    }
  }

  M.Player = Player;
})(window.M);
