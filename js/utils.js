/* Shared helpers and input for Super Mario — Browser Edition */
window.M = window.M || {};

(function (M) {
  'use strict';

  M.TILE = 32;
  M.VIEW_W = 960;
  M.VIEW_H = 480;
  M.ROWS = 15;

  M.clamp = function (v, min, max) {
    return v < min ? min : v > max ? max : v;
  };

  M.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  M.approach = function (v, target, delta) {
    if (v < target) return Math.min(v + delta, target);
    if (v > target) return Math.max(v - delta, target);
    return v;
  };

  M.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  M.makeRng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  M.fmtScore = function (n) {
    return String(Math.max(0, Math.floor(n))).padStart(6, '0');
  };

  M.pad = function (n, len) {
    return String(Math.max(0, Math.floor(n))).padStart(len, '0');
  };

  class Input {
    constructor(target) {
      this.down = new Set();
      this.just = new Set();
      this.keyMap = {
        ArrowLeft: 'left', KeyA: 'left',
        ArrowRight: 'right', KeyD: 'right',
        ArrowDown: 'down', KeyS: 'down',
        ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
        ShiftLeft: 'run', ShiftRight: 'run',
        KeyX: 'fire', KeyJ: 'fire',
        KeyP: 'pause', Escape: 'pause',
        KeyM: 'mute',
        Enter: 'start',
        KeyR: 'restart'
      };

      const isFormField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');

      target.addEventListener('keydown', (e) => {
        if (isFormField(e.target)) return;
        const action = this.keyMap[e.code];
        if (!action) return;
        e.preventDefault();
        if (!this.down.has(action)) {
          this.down.add(action);
          this.just.add(action);
        }
      }, { passive: false });

      target.addEventListener('keyup', (e) => {
        if (isFormField(e.target)) return;
        const action = this.keyMap[e.code];
        if (!action) return;
        e.preventDefault();
        this.down.delete(action);
      }, { passive: false });

      window.addEventListener('blur', () => this.down.clear());
    }

    held(action) { return this.down.has(action); }
    pressed(action) { return this.just.has(action); }
    endFrame() { this.just.clear(); }

    setVirtual(action, isDown) {
      if (isDown) {
        if (!this.down.has(action)) this.just.add(action);
        this.down.add(action);
      } else {
        this.down.delete(action);
      }
    }
  }

  M.Input = Input;
})(window.M);
