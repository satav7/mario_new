/* Level construction. Each level is built from simple tile-brush commands. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const ROWS = 15;
  const GROUND = 13;

  class LevelBuilder {
    constructor(opts) {
      this.lv = {
        name: opts.name,
        theme: opts.theme || 'overworld',
        width: opts.width,
        time: opts.time || 300,
        grid: Array.from({ length: ROWS }, () => new Array(opts.width).fill(' ')),
        enemies: [],
        contents: {},
        spawn: { x: 3, y: 12 },
        flagX: opts.width - 16,
        castleX: opts.width - 9
      };
    }

    set(x, y, ch) {
      const lv = this.lv;
      if (x < 0 || x >= lv.width || y < 0 || y >= ROWS) return this;
      lv.grid[y][x] = ch;
      return this;
    }

    ground(x1, x2) {
      for (let x = x1; x <= x2; x++) {
        this.set(x, GROUND, '#');
        this.set(x, GROUND + 1, '#');
      }
      return this;
    }

    fill(ch, x1, y1, x2, y2) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) this.set(x, y, ch);
      }
      return this;
    }

    brick(x, y, count = 1) {
      for (let i = 0; i < count; i++) this.set(x + i, y, 'B');
      return this;
    }

    hard(x, y, count = 1) {
      for (let i = 0; i < count; i++) this.set(x + i, y, 'S');
      return this;
    }

    question(x, y, content = 'coin') {
      this.set(x, y, '?');
      this.lv.contents[x + ',' + y] = content;
      return this;
    }

    coin(x, y) {
      return this.set(x, y, 'C');
    }

    coinRow(y, x1, x2, step = 1) {
      for (let x = x1; x <= x2; x += step) this.set(x, y, 'C');
      return this;
    }

    pipe(x, h) {
      for (let y = GROUND - h; y <= GROUND - 1; y++) {
        this.set(x, y, 'P');
        this.set(x + 1, y, 'P');
      }
      return this;
    }

    piranha(x, h) {
      this.lv.enemies.push({ type: 'piranha', x: x + 1, pipeH: h });
      return this;
    }

    stairs(x, steps, dir = 1, ch = 'S') {
      for (let i = 0; i < steps; i++) {
        const h = dir > 0 ? i + 1 : steps - i;
        for (let y = GROUND - h; y <= GROUND - 1; y++) this.set(x + i, y, ch);
      }
      return this;
    }

    goomba(x, footRow = GROUND) {
      this.lv.enemies.push({ type: 'goomba', x, footRow });
      return this;
    }

    koopa(x, footRow = GROUND) {
      this.lv.enemies.push({ type: 'koopa', x, footRow });
      return this;
    }

    spawn(x, y) {
      this.lv.spawn = { x, y };
      return this;
    }

    flag(x) {
      this.lv.flagX = x;
      return this;
    }

    castle(x) {
      this.lv.castleX = x;
      return this;
    }

    done() {
      return this.lv;
    }
  }

  /* ---------------------------------------------------------------- *
   * World 1-1 — Sunny Plains
   * ---------------------------------------------------------------- */
  function world1() {
    const b = new LevelBuilder({ name: '1-1', theme: 'overworld', width: 214, time: 300 });

    b.ground(0, 67).ground(71, 97).ground(101, 147).ground(151, 213);
    b.spawn(3, 12);

    b.coinRow(10, 9, 11, 2);
    b.goomba(14);
    b.question(16, 9, 'power');
    b.brick(20, 9, 5);
    b.question(21, 9);
    b.question(23, 9, 'power');
    b.goomba(26);

    b.pipe(30, 2);
    b.coinRow(8, 34, 36);
    b.goomba(34);
    b.pipe(39, 3);
    b.koopa(45);
    b.pipe(49, 4);
    b.piranha(49, 4);

    b.brick(53, 9, 2);
    b.brick(56, 7, 4);
    b.coinRow(6, 56, 59);
    b.goomba(57);

    b.coinRow(10, 64, 66, 2);
    b.coin(68, 9);
    b.coin(69, 8);
    b.coin(70, 9);

    b.goomba(74);
    b.koopa(80);
    b.brick(84, 9, 3);
    b.question(86, 9, 'power');
    b.coinRow(10, 91, 94);
    b.koopa(94);

    b.coin(98, 10);
    b.coin(99, 9);
    b.coin(100, 10);

    b.brick(104, 9, 5);
    b.question(106, 9);
    b.goomba(111);
    b.koopa(116);

    b.stairs(122, 4);
    b.hard(130, 8, 5);
    b.coinRow(7, 130, 134, 2);
    b.goomba(132, 8);

    b.coin(143, 10);
    b.coin(144, 9);
    b.coin(145, 10);
    b.coin(148, 9);
    b.coin(149, 8);
    b.coin(150, 9);

    b.goomba(155);
    b.goomba(157);
    b.brick(160, 9, 5);
    b.question(162, 9, 'power');
    b.koopa(166);
    b.pipe(170, 2);

    b.stairs(180, 5);
    b.coinRow(7, 186, 189);

    b.flag(197);
    b.castle(203);

    return b.done();
  }

  /* ---------------------------------------------------------------- *
   * World 1-2 — Shadow Caverns
   * ---------------------------------------------------------------- */
  function world2() {
    const b = new LevelBuilder({ name: '1-2', theme: 'underground', width: 200, time: 300 });

    b.ground(0, 40).ground(44, 80).ground(84, 120).ground(124, 160).ground(164, 199);
    b.spawn(3, 12);

    // cave ceiling decoration
    b.fill('B', 0, 1, 12, 1);
    b.fill('B', 22, 1, 46, 1);
    b.fill('B', 60, 1, 92, 1);
    b.fill('B', 104, 1, 132, 1);
    b.fill('B', 142, 1, 176, 1);
    b.fill('B', 186, 1, 199, 1);

    b.coinRow(11, 8, 10, 2);
    b.goomba(12);
    b.brick(16, 9, 4);
    b.question(18, 9, 'power');
    b.pipe(24, 3);
    b.piranha(24, 3);
    b.koopa(30);
    b.coinRow(10, 34, 37);

    b.coin(41, 10);
    b.coin(42, 9);
    b.coin(43, 10);

    b.koopa(48);
    b.goomba(52);
    b.hard(55, 9, 4);
    b.coinRow(8, 55, 58, 2);
    b.pipe(64, 2);
    b.piranha(64, 2);
    b.stairs(67, 3);
    b.hard(70, 8, 4);
    b.coinRow(7, 70, 73, 1);
    b.goomba(71, 8);
    b.goomba(77);

    b.coin(81, 10);
    b.coin(82, 9);
    b.coin(83, 10);

    b.goomba(88);
    b.koopa(92);
    b.question(96, 9, 'power');
    b.brick(100, 9, 5);
    b.question(102, 9);
    b.pipe(110, 4);
    b.piranha(110, 4);
    b.coinRow(8, 114, 117);
    b.koopa(117);

    b.coin(121, 9);
    b.coin(122, 8);
    b.coin(123, 9);

    b.goomba(128);
    b.goomba(132);
    b.hard(136, 10, 5);
    b.coinRow(9, 136, 140, 2);
    b.koopa(144);
    b.brick(148, 9, 5);
    b.question(150, 9, 'power');
    b.goomba(154);
    b.goomba(157);

    b.coin(161, 10);
    b.coin(162, 9);
    b.coin(163, 10);

    b.coinRow(11, 168, 171, 2);
    b.koopa(173);
    b.goomba(177);
    b.pipe(181, 2);
    b.piranha(181, 2);

    b.stairs(185, 4);
    b.flag(191);
    b.castle(196);

    return b.done();
  }

  /* ---------------------------------------------------------------- *
   * World 1-3 — Sunset Citadel
   * ---------------------------------------------------------------- */
  function world3() {
    const b = new LevelBuilder({ name: '1-3', theme: 'castle', width: 228, time: 350 });

    b.ground(0, 31).ground(35, 71).ground(75, 113).ground(117, 153).ground(157, 197).ground(201, 227);
    b.spawn(3, 12);

    b.goomba(8);
    b.question(12, 9, 'power');
    b.brick(16, 9, 4);
    b.koopa(22);
    b.coinRow(10, 25, 28, 1);

    b.coin(32, 9);
    b.coin(33, 8);
    b.coin(34, 9);

    b.pipe(40, 3);
    b.piranha(40, 3);
    b.goomba(46);
    b.brick(50, 9, 4);
    b.question(52, 9, 'power');
    b.koopa(56);
    b.hard(60, 9, 4);
    b.coinRow(8, 60, 63, 1);

    b.coin(72, 10);
    b.coin(73, 9);
    b.coin(74, 10);

    b.goomba(80);
    b.koopa(84);
    b.question(88, 9, 'power');
    b.brick(90, 9, 5);
    b.question(92, 9);
    b.pipe(100, 4);
    b.piranha(100, 4);
    b.goomba(96);
    b.coinRow(8, 104, 108, 2);

    b.coin(114, 10);
    b.coin(115, 9);
    b.coin(116, 9);

    b.stairs(120, 4);
    b.hard(128, 7, 5);
    b.coinRow(6, 128, 132, 2);
    b.koopa(130, 7);
    b.goomba(136);
    b.koopa(140);
    b.question(144, 9, 'power');
    b.brick(146, 9, 4);

    b.coin(154, 9);
    b.coin(155, 8);
    b.coin(156, 9);

    b.goomba(160);
    b.goomba(164);
    b.pipe(168, 2);
    b.piranha(168, 2);
    b.koopa(172);
    b.brick(176, 9, 5);
    b.question(178, 9, 'power');
    b.goomba(184);
    b.coinRow(10, 188, 191, 1);

    b.coin(198, 9);
    b.coin(199, 8);
    b.coin(200, 9);

    b.stairs(204, 6);
    b.goomba(194);
    b.flag(215);
    b.castle(221);

    return b.done();
  }

  const factories = [world1, world2, world3];

  M.LEVEL_COUNT = factories.length;

  M.createLevel = function (index) {
    return factories[M.clamp(index, 0, factories.length - 1)]();
  };
})(window.M);
