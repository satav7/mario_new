/* All canvas drawing: backgrounds, tiles, characters, HUD. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const T = M.TILE;
  const VIEW_W = M.VIEW_W;
  const VIEW_H = M.VIEW_H;

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = (h ^ (h >> 13)) * 1274126177 >>> 0;
    return h / 4294967296;
  }

  const THEME = {
    overworld: {
      dirt: '#a3652f',
      dirtDark: '#7c4620',
      dirtLight: '#c07c3c',
      grass: '#43b04a',
      grassDark: '#2c7d34',
      brick: '#c8641e',
      brickDark: '#7c3610',
      brickLight: '#e58a3a',
      stone: '#9aa3ad',
      stoneDark: '#59616b',
      stoneLight: '#c7cfd8'
    },
    underground: {
      dirt: '#465777',
      dirtDark: '#2c3a55',
      dirtLight: '#60759b',
      grass: '#5f86c4',
      grassDark: '#37588c',
      brick: '#3d5c86',
      brickDark: '#22344f',
      brickLight: '#5a7ba9',
      stone: '#7c8ca8',
      stoneDark: '#414f66',
      stoneLight: '#a5b6d1'
    },
    castle: {
      dirt: '#6e4a52',
      dirtDark: '#472b34',
      dirtLight: '#8f6269',
      grass: '#a85d4f',
      grassDark: '#74382f',
      brick: '#9c5a45',
      brickDark: '#5b2c1f',
      brickLight: '#c47d5e',
      stone: '#a29199',
      stoneDark: '#5d4b53',
      stoneLight: '#cbbcc3'
    }
  };

  /* ----------------------------- background ----------------------------- */

  function cloud(ctx, x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.arc(24, -8, 27, 0, Math.PI * 2);
    ctx.arc(52, 0, 20, 0, Math.PI * 2);
    ctx.arc(26, 10, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210,235,255,0.75)';
    ctx.beginPath();
    ctx.arc(26, 14, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function hill(ctx, x, baseY, w, h, color, dark) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY);
    ctx.quadraticCurveTo(x, baseY - h * 1.8, x + w / 2, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, baseY);
    ctx.quadraticCurveTo(x + w * 0.18, baseY - h * 0.9, x + w * 0.36, baseY);
    ctx.closePath();
    ctx.fill();
  }

  function bush(ctx, x, baseY, s) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.scale(s, s);
    ctx.fillStyle = '#2f9c44';
    ctx.beginPath();
    ctx.arc(0, -8, 17, Math.PI, 0);
    ctx.arc(24, -12, 22, Math.PI, 0);
    ctx.arc(50, -8, 17, Math.PI, 0);
    ctx.rect(0, -12, 50, 12);
    ctx.fill();
    ctx.fillStyle = '#3fbd55';
    ctx.beginPath();
    ctx.arc(24, -16, 15, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawBackground(ctx, game) {
    const cam = game.camera.x;
    const theme = game.level.theme;
    const decor = game.decor;

    if (theme === 'overworld') {
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#3f8ef0');
      sky.addColorStop(0.62, '#93d3fa');
      sky.addColorStop(1, '#dcf4ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // sun
      const sunGlow = ctx.createRadialGradient(790, 96, 10, 790, 96, 90);
      sunGlow.addColorStop(0, 'rgba(255,252,210,0.95)');
      sunGlow.addColorStop(0.4, 'rgba(255,246,170,0.55)');
      sunGlow.addColorStop(1, 'rgba(255,246,170,0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(680, 0, 220, 200);

      for (const c of decor.clouds) {
        const sx = c.x - cam * 0.3;
        if (sx > -160 && sx < VIEW_W + 160) cloud(ctx, sx, c.y, c.s);
      }
      for (const h of decor.hills) {
        const sx = h.x - cam * 0.45;
        if (sx > -400 && sx < VIEW_W + 400) hill(ctx, sx, 430, h.w, h.h, '#7ed37f', '#5bbd68');
      }
      for (const b of decor.bushes) {
        const sx = b.x - cam * 0.75;
        if (sx > -200 && sx < VIEW_W + 200) bush(ctx, sx, 424, b.s);
      }
    } else if (theme === 'underground') {
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#070d1f');
      sky.addColorStop(0.7, '#111b36');
      sky.addColorStop(1, '#1b2745');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // distant cave brickwork
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#6f8fc4';
      ctx.lineWidth = 2;
      const off = -(cam * 0.45) % 96;
      for (let bx = off - 96; bx < VIEW_W + 96; bx += 96) {
        for (let by = 0; by < VIEW_H; by += 64) {
          ctx.strokeRect(bx, by, 96, 64);
          ctx.beginPath();
          ctx.moveTo(bx + 48, by);
          ctx.lineTo(bx + 48, by + 64);
          ctx.stroke();
        }
      }
      ctx.restore();

      for (const c of decor.crystals) {
        const sx = c.x - cam * 0.55;
        if (sx < -40 || sx > VIEW_W + 40) continue;
        const glow = ctx.createRadialGradient(sx, c.y, 2, sx, c.y, 42);
        glow.addColorStop(0, 'rgba(120,235,255,0.5)');
        glow.addColorStop(1, 'rgba(120,235,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 44, c.y - 44, 88, 88);
        ctx.fillStyle = '#8ff0ff';
        ctx.beginPath();
        ctx.moveTo(sx, c.y - 14);
        ctx.lineTo(sx + 8, c.y);
        ctx.lineTo(sx, c.y + 14);
        ctx.lineTo(sx - 8, c.y);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      sky.addColorStop(0, '#1b103c');
      sky.addColorStop(0.45, '#6b2f66');
      sky.addColorStop(0.75, '#e06a4c');
      sky.addColorStop(1, '#ffcf7a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // stars
      for (const s of decor.stars) {
        const sx = s.x - cam * 0.08;
        if (sx < -10 || sx > VIEW_W + 10) continue;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(game.gameTime * 0.8 + s.x));
        rect(ctx, sx, s.y, s.size, s.size, '#fff4d6');
      }
      ctx.globalAlpha = 1;

      // sun
      const sun = ctx.createRadialGradient(700, 300, 20, 700, 300, 130);
      sun.addColorStop(0, 'rgba(255,235,150,1)');
      sun.addColorStop(0.45, 'rgba(255,170,90,0.8)');
      sun.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(520, 140, 360, 320);

      for (const t of decor.towers) {
        const sx = t.x - cam * 0.25;
        if (sx < -260 || sx > VIEW_W + 260) continue;
        ctx.fillStyle = 'rgba(54,28,64,0.55)';
        ctx.fillRect(sx, 300 - t.h, t.w, t.h + 140);
        ctx.fillRect(sx - 8, 300 - t.h - 18, t.w + 16, 22);
        ctx.fillStyle = 'rgba(255,200,120,0.5)';
        for (let wy = 300 - t.h + 16; wy < 380; wy += 34) {
          ctx.fillRect(sx + t.w / 2 - 4, wy, 8, 12);
        }
      }

      // foreground haze
      const haze = ctx.createLinearGradient(0, 340, 0, VIEW_H);
      haze.addColorStop(0, 'rgba(255,150,100,0)');
      haze.addColorStop(1, 'rgba(255,120,80,0.28)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 340, VIEW_W, VIEW_H - 340);
    }
  }

  /* -------------------------------- tiles -------------------------------- */

  function drawGround(ctx, game, tx, ty, x, y, pal) {
    const isTop = !game.isSolid(tx, ty - 1);
    const r = hash(tx, ty);

    rect(ctx, x, y, T, T, pal.dirt);
    rect(ctx, x, y + T - 4, T, 4, pal.dirtDark);

    // speckles
    ctx.fillStyle = pal.dirtDark;
    for (let i = 0; i < 3; i++) {
      const sx = x + 4 + hash(tx * 3 + i, ty) * 24;
      const sy = y + 8 + hash(tx, ty * 5 + i) * 20;
      ctx.fillRect(sx, sy, 3, 3);
    }
    if (r > 0.75) {
      rect(ctx, x + 6, y + 14, 5, 4, pal.dirtLight);
    }

    if (isTop) {
      rect(ctx, x, y, T, 9, pal.grass);
      rect(ctx, x, y + 9, T, 3, pal.grassDark);
      ctx.fillStyle = pal.grass;
      for (let i = 0; i < 4; i++) {
        const sx = x + 2 + i * 8;
        ctx.fillRect(sx, y - 2, 4, 4);
      }
    }
  }

  function drawBrick(ctx, tx, ty, x, y, pal) {
    rect(ctx, x, y, T, T, pal.brick);
    rect(ctx, x, y, T, 3, pal.brickLight);
    ctx.strokeStyle = pal.brickDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 16);
    ctx.lineTo(x + T - 2, y + 16);
    ctx.moveTo(x + 12, y + 2);
    ctx.lineTo(x + 12, y + 16);
    ctx.moveTo(x + 22, y + 16);
    ctx.lineTo(x + 22, y + 30);
    ctx.stroke();
  }

  function drawQuestion(ctx, game, tx, ty, x, y, pal) {
    const pulse = 0.5 + 0.5 * Math.sin(game.gameTime * 5 + tx);
    const base = pulse > 0.5 ? '#ffce3a' : '#f5b81c';
    rect(ctx, x, y, T, T, base);
    rect(ctx, x, y, T, 4, '#ffe98a');
    rect(ctx, x, y + T - 4, T, 4, '#b06a00');
    ctx.strokeStyle = '#8a4b00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);

    ctx.fillStyle = '#8a4b00';
    for (const [rx, ry] of [[4, 4], [T - 8, 4], [4, T - 8], [T - 8, T - 8]]) {
      ctx.fillRect(x + rx, y + ry, 3, 3);
    }

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a4b00';
    ctx.fillText('?', x + T / 2 + 1, y + T / 2 + 2);
    ctx.fillStyle = '#fff8d0';
    ctx.fillText('?', x + T / 2, y + T / 2 + 1);
  }

  function drawUsed(ctx, x, y, pal) {
    rect(ctx, x, y, T, T, '#a9743e');
    rect(ctx, x + 2, y + 2, T - 4, T - 4, '#8a5a2b');
    rect(ctx, x + 3, y + 3, T - 6, 3, '#c08a52');
    ctx.strokeStyle = '#5f3a17';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
  }

  function drawStone(ctx, x, y, pal) {
    rect(ctx, x, y, T, T, pal.stone);
    rect(ctx, x + 2, y + 2, T - 4, 4, pal.stoneLight);
    rect(ctx, x + 2, y + T - 6, T - 4, 4, pal.stoneDark);
    ctx.strokeStyle = pal.stoneDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
    rect(ctx, x + 8, y + 12, 6, 5, pal.stoneDark);
  }

  function drawPipe(ctx, game, tx, ty, x, y) {
    const isTop = game.tileAt(tx, ty - 1) !== 'P';
    const isLeft = game.tileAt(tx - 1, ty) === 'P';

    rect(ctx, x, y, T, T, '#1f7a2c');
    rect(ctx, x + (isLeft ? 4 : 20), y, 8, T, '#39b64a');
    if (isLeft) {
      rect(ctx, x, y, 3, T, '#0d4f18');
    } else {
      rect(ctx, x + T - 4, y, 4, T, '#0d4f18');
    }

    if (isTop) {
      rect(ctx, x, y, T, 12, '#2b9a3a');
      rect(ctx, x, y, T, 3, '#63d977');
      rect(ctx, x, y + 9, T, 3, '#126a20');
      rect(ctx, x, y, 2, 12, '#0d4f18');
      rect(ctx, x + T - 2, y, 2, 12, '#0d4f18');
      if (isLeft) {
        ctx.fillStyle = '#4fc95f';
        ctx.fillRect(x + 5, y + 3, 4, 7);
      }
    }
  }

  function drawCoinTile(ctx, game, tx, ty, x, y) {
    const phase = Math.abs(Math.cos(game.gameTime * 4 + tx * 0.8));
    const w = Math.max(3, 15 * phase);
    const cx = x + T / 2;
    const cy = y + T / 2;
    ctx.fillStyle = 'rgba(255,210,60,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    rect(ctx, cx - w / 2, cy - 10, w, 20, '#f7c53a');
    rect(ctx, cx - w / 2, cy - 10, Math.max(1.5, w * 0.25), 20, '#fff3ad');
    rect(ctx, cx - w / 2, cy + 7, w, 3, '#b07a00');
    if (phase > 0.4) {
      rect(ctx, cx - 1.5, cy - 6, 3, 12, '#b07a00');
    }
  }

  function drawTiles(ctx, game) {
    const pal = THEME[game.level.theme] || THEME.overworld;
    const camX = game.camera.x;
    const startX = Math.max(0, Math.floor(camX / T) - 1);
    const endX = Math.min(game.level.width - 1, Math.ceil((camX + VIEW_W) / T) + 1);

    for (let ty = 0; ty < 15; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const ch = game.tileAt(tx, ty);
        if (ch === ' ') continue;
        const bump = game.bumpOffset(tx, ty);
        const x = tx * T;
        const y = ty * T + bump;

        switch (ch) {
          case '#': drawGround(ctx, game, tx, ty, x, y, pal); break;
          case 'B': drawBrick(ctx, tx, ty, x, y, pal); break;
          case '?': drawQuestion(ctx, game, tx, ty, x, y, pal); break;
          case 'U': drawUsed(ctx, x, y, pal); break;
          case 'S': drawStone(ctx, x, y, pal); break;
          case 'P': drawPipe(ctx, game, tx, ty, x, y); break;
          case 'C': drawCoinTile(ctx, game, tx, ty, x, y); break;
          default: break;
        }
      }
    }
  }

  /* ------------------------------ scenery ------------------------------- */

  function drawFlag(ctx, game) {
    const poleX = game.level.flagX * T + 15;
    const topY = 56;
    const baseY = 13 * T;
    const progress = game.player ? game.player.flagProgress || 0 : 0;
    const flagY = 74 + progress * (baseY - 74 - 40);

    // base
    rect(ctx, poleX - 10, baseY - 14, 20, 14, '#6d6d6d');
    rect(ctx, poleX - 10, baseY - 14, 20, 4, '#9a9a9a');

    // pole
    rect(ctx, poleX - 3, topY, 6, baseY - topY, '#c7d3da');
    rect(ctx, poleX - 1, topY, 2, baseY - topY, '#ffffff');

    // ball
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(poleX, topY - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3ad';
    ctx.beginPath();
    ctx.arc(poleX - 2, topY - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // flag cloth
    const wave = Math.sin(game.gameTime * 4) * 4;
    ctx.fillStyle = game.level.theme === 'castle' ? '#4da3ff' : '#f5f5f5';
    ctx.beginPath();
    ctx.moveTo(poleX + 2, flagY);
    ctx.quadraticCurveTo(poleX + 34, flagY - 6 + wave, poleX + 34, flagY + 20);
    ctx.lineTo(poleX + 2, flagY + 38);
    ctx.closePath();
    ctx.fill();

    // star
    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    const sx = poleX + 15;
    const sy = flagY + 18;
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? 8 : 3.5;
      ctx.lineTo(sx + Math.cos(ang) * rad, sy + Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawCastle(ctx, game) {
    const gx = game.level.castleX * T;
    const gy = 13 * T;
    ctx.save();
    ctx.translate(gx, gy);

    const stone = '#8d5a4a';
    const dark = '#5f3428';
    const light = '#b57a5f';

    // main keep
    rect(ctx, 8, -132, 116, 132, stone);
    // battlements
    for (let i = 0; i < 5; i++) rect(ctx, 8 + i * 24, -144, 15, 14, stone);
    // towers
    rect(ctx, -14, -168, 34, 168, stone);
    rect(ctx, 112, -168, 34, 168, stone);
    for (let i = 0; i < 2; i++) {
      rect(ctx, -14 + i * 18, -180, 14, 14, stone);
      rect(ctx, 112 + i * 18, -180, 14, 14, stone);
    }
    // tower roofs
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(-20, -168);
    ctx.lineTo(3, -200);
    ctx.lineTo(26, -168);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(106, -168);
    ctx.lineTo(129, -200);
    ctx.lineTo(152, -168);
    ctx.closePath();
    ctx.fill();

    // brick lines
    ctx.strokeStyle = 'rgba(60,25,15,0.35)';
    ctx.lineWidth = 2;
    for (let y = -132; y < 0; y += 22) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(124, y);
      ctx.stroke();
    }

    // door
    rect(ctx, 48, -54, 36, 54, '#1c1220');
    ctx.fillStyle = '#1c1220';
    ctx.beginPath();
    ctx.arc(66, -54, 18, Math.PI, 0);
    ctx.fill();
    rect(ctx, 52, -46, 28, 46, '#332540');
    // door arch detail
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.strokeRect(50, -52, 32, 52);

    // windows
    rect(ctx, -4, -140, 12, 16, '#2a1b22');
    rect(ctx, 124, -140, 12, 16, '#2a1b22');
    rect(ctx, 28, -112, 12, 16, '#2a1b22');
    rect(ctx, 92, -112, 12, 16, '#2a1b22');

    // highlights
    rect(ctx, 8, -132, 3, 132, light);
    rect(ctx, 121, -132, 3, 132, dark);
    rect(ctx, -14, -168, 3, 168, light);
    rect(ctx, 143, -168, 3, 168, dark);

    // flag on the keep
    rect(ctx, 64, -206, 3, 62, '#e8e8e8');
    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    ctx.moveTo(67, -204);
    ctx.lineTo(96, -195);
    ctx.lineTo(67, -184);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /* ------------------------------ characters ---------------------------- */

  function marioPalette(fire) {
    return fire
      ? { cap: '#e52521', shirt: '#ffffff', overall: '#ffffff', overallDark: '#d8d8d8', button: '#e52521' }
      : { cap: '#e52521', shirt: '#e52521', overall: '#2b4bd7', overallDark: '#1d34a0', button: '#ffd23f' };
  }

  function drawMario(ctx, game) {
    const p = game.player;
    if (!p) return;
    if (p.invuln > 0 && Math.floor(game.gameTime * 24) % 2 === 0) return;

    const pal = marioPalette(p.fire);
    const skin = '#ffc59b';
    const hair = '#5d2f10';
    const shoe = '#6b3a12';

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y);
    ctx.scale(p.facing, 1);
    ctx.translate(-p.w / 2, 0);

    if (p.big) {
      ctx.scale(p.w / 24, p.h / 52);
      drawBigMario(ctx, pal, skin, hair, shoe, p);
    } else {
      ctx.scale(p.w / 24, p.h / 30);
      drawSmallMario(ctx, pal, skin, hair, shoe, p);
    }

    ctx.restore();
  }

  function drawSmallMario(ctx, pal, skin, hair, shoe, p) {
    const frame = Math.floor(p.walkTime * 11) % 4;
    const walking = p.onGround && Math.abs(p.vx) > 12 && p.state !== 'flag';
    const airborne = !p.onGround || p.state === 'flag';
    const leg = walking ? [0, 2, 0, -2][frame] : 0;

    // cap
    rect(ctx, 3, 0, 18, 4, pal.cap);
    rect(ctx, 1, 4, 22, 3, pal.cap);
    rect(ctx, 2, 7, 4, 2, pal.cap);

    // face
    rect(ctx, 5, 8, 14, 9, skin);
    rect(ctx, 3, 8, 3, 6, hair);
    rect(ctx, 16, 9, 3, 2, hair); // sideburn
    rect(ctx, 14, 10, 2, 3, '#2a1c16');
    rect(ctx, 9, 14, 8, 2, hair);
    rect(ctx, 15, 15, 3, 2, skin);

    // torso
    rect(ctx, 4, 17, 16, 6, pal.shirt);
    rect(ctx, 2, 18, 3, 6, pal.shirt);
    rect(ctx, 19, 18, 3, 6, pal.shirt);

    // overalls
    rect(ctx, 7, 19, 10, 8, pal.overall);
    rect(ctx, 8, 17, 2, 3, pal.overall);
    rect(ctx, 14, 17, 2, 3, pal.overall);
    rect(ctx, 9, 21, 2, 2, pal.button);
    rect(ctx, 14, 21, 2, 2, pal.button);

    // legs
    if (airborne) {
      rect(ctx, 3, 25, 6, 3, pal.overall);
      rect(ctx, 15, 25, 6, 3, pal.overall);
      rect(ctx, 1, 26, 7, 3, shoe);
      rect(ctx, 16, 26, 7, 3, shoe);
    } else {
      rect(ctx, 5 + leg, 26, 6, 3, pal.overall);
      rect(ctx, 13 - leg, 26, 6, 3, pal.overall);
      rect(ctx, 3 + leg, 28, 8, 2, shoe);
      rect(ctx, 13 - leg, 28, 8, 2, shoe);
    }
  }

  function drawBigMario(ctx, pal, skin, hair, shoe, p) {
    const frame = Math.floor(p.walkTime * 11) % 4;
    const walking = p.onGround && Math.abs(p.vx) > 12 && p.state !== 'flag';
    const airborne = !p.onGround || p.state === 'flag';
    const leg = walking ? [0, 3, 0, -3][frame] : 0;

    // cap
    rect(ctx, 3, 0, 18, 6, pal.cap);
    rect(ctx, 1, 6, 22, 4, pal.cap);
    rect(ctx, 2, 10, 4, 2, pal.cap);

    // face
    rect(ctx, 5, 11, 14, 11, skin);
    rect(ctx, 3, 11, 3, 8, hair);
    rect(ctx, 16, 13, 3, 2, hair);
    rect(ctx, 14, 13, 2, 4, '#2a1c16');
    rect(ctx, 9, 19, 8, 2, hair);
    rect(ctx, 15, 20, 3, 2, skin);

    // torso
    rect(ctx, 4, 23, 16, 8, pal.shirt);
    rect(ctx, 2, 24, 3, 9, pal.shirt);
    rect(ctx, 19, 24, 3, 9, pal.shirt);

    // overalls
    rect(ctx, 6, 28, 12, 12, pal.overall);
    rect(ctx, 8, 23, 2, 5, pal.overall);
    rect(ctx, 14, 23, 2, 5, pal.overall);
    rect(ctx, 9, 30, 2, 2, pal.button);
    rect(ctx, 14, 30, 2, 2, pal.button);
    rect(ctx, 11, 33, 2, 5, pal.overallDark);

    // legs
    if (airborne) {
      rect(ctx, 3, 40, 7, 8, pal.overall);
      rect(ctx, 15, 40, 7, 8, pal.overall);
      rect(ctx, 1, 47, 9, 5, shoe);
      rect(ctx, 15, 47, 9, 5, shoe);
    } else {
      rect(ctx, 5 + leg, 40, 6, 8, pal.overall);
      rect(ctx, 13 - leg, 40, 6, 8, pal.overall);
      rect(ctx, 3 + leg, 47, 9, 5, shoe);
      rect(ctx, 13 - leg, 47, 9, 5, shoe);
    }
  }

  function drawGoomba(ctx, e, gameTime) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);

    if (e.flipped) {
      ctx.rotate(Math.PI);
    }

    if (e.squash > 0) {
      ctx.scale(1.18, 0.35);
    } else {
      const bob = Math.abs(Math.sin(e.anim)) * 1.5;
      ctx.translate(0, -bob);
    }

    // feet
    ctx.fillStyle = '#4a2410';
    ctx.fillRect(-13, -5, 11, 5);
    ctx.fillRect(2, -5, 11, 5);

    // body
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.ellipse(0, -15, 13, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c47a4e';
    ctx.beginPath();
    ctx.ellipse(-3, -19, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(-8, -20, 5, 7);
    ctx.fillRect(3, -20, 5, 7);
    ctx.fillStyle = '#1c1008';
    ctx.fillRect(-6, -18, 3, 5);
    ctx.fillRect(4, -18, 3, 5);

    // eyebrows
    ctx.fillStyle = '#3a1c0a';
    ctx.fillRect(-9, -23, 6, 3);
    ctx.fillRect(3, -23, 6, 3);

    ctx.restore();
  }

  function drawKoopa(ctx, e, gameTime) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);

    if (e.flipped) ctx.rotate(Math.PI);

    if (e.state === 'walk') {
      const step = Math.sin(e.anim * 2) * 2;
      // feet
      rect(ctx, -11, -6 + step, 8, 6, '#e8b33a');
      rect(ctx, 3, -6 - step, 8, 6, '#e8b33a');
      // shell
      ctx.fillStyle = '#2e9e3f';
      ctx.beginPath();
      ctx.ellipse(-2, -19, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c6f2c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-2, -19, 8, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#7fdc8c';
      ctx.beginPath();
      ctx.ellipse(-6, -24, 4, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // head
      const hx = 8;
      const hy = -32;
      rect(ctx, hx - 2, hy, 11, 13, '#f2c744');
      rect(ctx, hx + 5, hy + 3, 5, 6, '#f2c744');
      rect(ctx, hx + 7, hy + 2, 2, 3, '#1c1008');
      rect(ctx, hx + 4, hy + 3, 2, 3, '#1c1008');
      rect(ctx, hx + 8, hy + 7, 2, 2, '#c99a22');
    } else {
      // shell only
      const spin = Math.abs(e.vx) > 10 ? Math.sin(e.spin) : 0;
      ctx.save();
      ctx.translate(0, -13);
      ctx.rotate(spin * 0.15);
      ctx.fillStyle = '#2e9e3f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c6f2c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#125c22';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.fillStyle = '#7fdc8c';
      ctx.beginPath();
      ctx.ellipse(-5, -5, 4, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawPiranha(ctx, e) {
    if (e.flipped) return;
    const pipeTop = e.baseY - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(e.x - 30, pipeTop - 160, e.w + 60, 160);
    ctx.clip();

    const cx = e.x + e.w / 2;
    const headY = e.y + 16;

    // stem
    rect(ctx, cx - 4, headY, 8, pipeTop - headY + 14, '#2e9e3f');
    rect(ctx, cx - 1, headY, 2, pipeTop - headY + 14, '#6fdb7d');

    // leaves
    ctx.fillStyle = '#3fbd55';
    ctx.beginPath();
    ctx.ellipse(cx - 12, pipeTop - 6, 12, 5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + 12, pipeTop - 10, 12, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = '#d92b2b';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 12, 15, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // spots
    ctx.fillStyle = '#fff';
    for (const [ox, oy, r] of [[-7, -18, 3.5], [6, -19, 3], [0, -6, 3], [-10, -9, 2.5], [9, -8, 2.5]]) {
      ctx.beginPath();
      ctx.arc(cx + ox, headY + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // mouth
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 4, 8, 4, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#2a0a0a';
    ctx.beginPath();
    ctx.ellipse(cx, headY - 3, 5, 2.5, 0, 0, Math.PI);
    ctx.fill();

    ctx.restore();
  }

  function drawMushroom(ctx, e) {
    const bob = e.spawnT > 0 ? 0 : Math.sin(e.anim) * 1.5;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h + bob);
    // stem
    rect(ctx, -9, -12, 18, 12, '#ffe9c9');
    rect(ctx, -6, -14, 12, 4, '#f5d6ac');
    // eyes
    rect(ctx, -5, -8, 3, 5, '#4a2a12');
    rect(ctx, 2, -8, 3, 5, '#4a2a12');
    // cap
    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    ctx.arc(0, -14, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-14, -15, 28, 3);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-7, -21, 4, 0, Math.PI * 2);
    ctx.arc(6, -23, 3.5, 0, Math.PI * 2);
    ctx.arc(0, -14, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFlower(ctx, e) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h);
    const sway = Math.sin(e.anim * 1.3) * 2;

    rect(ctx, -2 + sway * 0.3, -16, 4, 16, '#2e9e3f');
    ctx.fillStyle = '#3fbd55';
    ctx.beginPath();
    ctx.ellipse(-8, -8, 7, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8 + sway, -11, 7, 3.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    const cy = -24;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + e.anim * 0.6;
      ctx.fillStyle = i % 2 ? '#ff8c1a' : '#ffcf3d';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 9 + sway, cy + Math.sin(a) * 9, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff4c2';
    ctx.beginPath();
    ctx.arc(sway, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2a12';
    ctx.beginPath();
    ctx.arc(sway - 2, cy - 1, 1.6, 0, Math.PI * 2);
    ctx.arc(sway + 2, cy - 1, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFireball(ctx, e) {
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.rotate(e.spin);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
    glow.addColorStop(0, 'rgba(255,240,150,0.8)');
    glow.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b00';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(-1, -1, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ------------------------------- effects ------------------------------ */

  function drawParticles(ctx, game) {
    for (const p of game.particles) {
      const a = M.clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      if (p.shape === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        rect(ctx, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, p.color);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(ctx, game) {
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of game.floaters) {
      ctx.globalAlpha = M.clamp(f.life / 0.8, 0, 1);
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color || '#fff3ad';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* --------------------------------- HUD -------------------------------- */

  function label(ctx, text, x, y, align = 'left', size = 16, color = '#fff') {
    ctx.font = `bold ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawHUD(ctx, game) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, 52);
    grad.addColorStop(0, 'rgba(6,10,24,0.6)');
    grad.addColorStop(1, 'rgba(6,10,24,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, 52);

    label(ctx, 'MARIO', 20, 22, 'left', 13, '#ffe9a8');
    label(ctx, M.fmtScore(game.score), 20, 42, 'left', 17);

    // coin icon
    const coinX = 180;
    const coinY = 20;
    rect(ctx, coinX, coinY, 14, 18, '#f7c53a');
    rect(ctx, coinX + 3, coinY + 2, 4, 14, '#fff3ad');
    label(ctx, '×' + M.pad(game.coins, 2), 202, 37, 'left', 17);

    label(ctx, 'WORLD', 330, 22, 'left', 13, '#ffe9a8');
    label(ctx, game.level ? game.level.name : '1-1', 338, 42, 'left', 17);

    label(ctx, 'TIME', 470, 22, 'left', 13, '#ffe9a8');
    const time = Math.max(0, Math.ceil(game.timeLeft));
    const timeColor = time <= 30 ? (Math.floor(game.gameTime * 4) % 2 ? '#ff5a5a' : '#fff') : '#fff';
    label(ctx, M.pad(time, 3), 474, 42, 'left', 17, timeColor);

    label(ctx, 'LIVES', 610, 22, 'left', 13, '#ffe9a8');
    label(ctx, '×' + game.lives, 616, 42, 'left', 17);

    if (game.muted) {
      label(ctx, 'MUTED', VIEW_W - 22, 24, 'right', 13, '#ffb3b3');
    }
    label(ctx, 'P PAUSE', VIEW_W - 22, 42, 'right', 12, 'rgba(255,255,255,0.65)');

    ctx.restore();
  }

  /* -------------------------------- main -------------------------------- */

  M.drawGame = function (ctx, game) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBackground(ctx, game);

    const shake = game.shake || 0;
    const shakeX = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
    const shakeY = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;

    ctx.save();
    ctx.translate(-Math.round(game.camera.x) + shakeX, shakeY);

    drawFlag(ctx, game);
    drawCastle(ctx, game);
    drawTiles(ctx, game);

    // entities
    for (const e of game.entities) {
      if (e.type === 'goomba') drawGoomba(ctx, e, game.gameTime);
      else if (e.type === 'koopa') drawKoopa(ctx, e, game.gameTime);
      else if (e.type === 'piranha') drawPiranha(ctx, e);
      else if (e.type === 'mushroom') {
        if (e.variant === 'flower') drawFlower(ctx, e);
        else drawMushroom(ctx, e);
      } else if (e.type === 'fireball') drawFireball(ctx, e);
    }

    if (game.state !== 'title') drawMario(ctx, game);

    drawParticles(ctx, game);
    drawFloaters(ctx, game);

    ctx.restore();

    if (game.state !== 'title') drawHUD(ctx, game);

    if (game.state === 'title') {
      const shade = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      shade.addColorStop(0, 'rgba(0,0,0,0.05)');
      shade.addColorStop(0.55, 'rgba(0,0,0,0.15)');
      shade.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  };
})(window.M);
