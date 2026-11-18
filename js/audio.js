/* Tiny WebAudio synthesizer: sound effects + looping chiptune. */
window.M = window.M || {};

(function (M) {
  'use strict';

  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Original 4-bar loop (eighth notes). 0 = rest.
  const MELODY = [
    76, 79, 81, 79, 76, 74, 72, 74,
    76, 79, 81, 84, 83, 81, 79, 76,
    77, 81, 84, 81, 79, 76, 74, 72,
    74, 77, 81, 79, 76, 74, 72, 0
  ];
  // Root note per half-bar (every 4 eighths).
  const BASS = [48, 48, 45, 45, 53, 53, 55, 55];
  const STEP = 60 / 138 / 2;

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.muted = false;
      this.musicTimer = null;
      this.step = 0;
      this.nextTime = 0;
      this.musicWanted = false;
    }

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        this.master.connect(this.ctx.destination);

        const length = Math.floor(this.ctx.sampleRate * 0.35);
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }

    setMuted(muted) {
      this.muted = muted;
      if (this.master) {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.setValueAtTime(muted ? 0 : 0.55, this.ctx.currentTime);
      }
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    tone(freq, dur, type, vol, when, endFreq) {
      if (!this.ensure()) return;
      const ctx = this.ctx;
      const t = when || ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      }
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    noise(dur, vol, when, highpass) {
      if (!this.ensure() || !this.noiseBuffer) return;
      const ctx = this.ctx;
      const t = when || ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.0001, vol), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = src;
      if (highpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpass;
        src.connect(filter);
        node = filter;
      }
      node.connect(gain);
      gain.connect(this.master);
      src.start(t);
      src.stop(t + dur);
    }

    /* ---------------- sound effects ---------------- */

    jump() {
      const t = this.ctx ? this.ctx.currentTime : 0;
      this.tone(360, 0.16, 'square', 0.10, t, 780);
    }

    coin() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      this.tone(988, 0.07, 'square', 0.10, t);
      this.tone(1319, 0.16, 'square', 0.10, t + 0.07);
    }

    stomp() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      this.tone(180, 0.09, 'square', 0.12, t, 70);
      this.noise(0.06, 0.10, t, 400);
    }

    bump() {
      if (!this.ensure()) return;
      this.tone(120, 0.09, 'triangle', 0.15, this.ctx.currentTime, 70);
    }

    breakBlock() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      this.noise(0.18, 0.16, t, 300);
      this.tone(160, 0.12, 'square', 0.09, t, 60);
    }

    powerup() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      [72, 76, 79, 84, 88, 91].forEach((n, i) => {
        this.tone(midiToFreq(n), 0.10, 'square', 0.09, t + i * 0.055);
      });
    }

    powerAppear() {
      if (!this.ensure()) return;
      this.tone(330, 0.2, 'square', 0.06, this.ctx.currentTime, 660);
    }

    fireball() {
      if (!this.ensure()) return;
      this.tone(880, 0.12, 'square', 0.08, this.ctx.currentTime, 240);
    }

    hurt() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      this.tone(440, 0.12, 'sawtooth', 0.12, t, 220);
      this.tone(220, 0.18, 'sawtooth', 0.10, t + 0.12, 110);
    }

    die() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const seq = [76, 72, 67, 64, 60, 55, 48];
      seq.forEach((n, i) => this.tone(midiToFreq(n), 0.18, 'square', 0.10, t + i * 0.13));
    }

    flag() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
        this.tone(midiToFreq(n), 0.12, 'square', 0.09, t + i * 0.07);
      });
    }

    clear() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const seq = [72, 76, 79, 84, 79, 84, 88];
      seq.forEach((n, i) => this.tone(midiToFreq(n), 0.16, 'square', 0.10, t + i * 0.12));
      this.tone(midiToFreq(84), 0.5, 'triangle', 0.10, t + 0.85);
      this.tone(midiToFreq(72), 0.5, 'triangle', 0.08, t + 0.85);
    }

    oneUp() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      [76, 79, 88, 91, 96].forEach((n, i) => {
        this.tone(midiToFreq(n), 0.10, 'square', 0.09, t + i * 0.06);
      });
    }

    gameOver() {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      [67, 65, 64, 62, 60, 48].forEach((n, i) => {
        this.tone(midiToFreq(n), 0.28, 'triangle', 0.11, t + i * 0.2);
      });
    }

    /* ---------------- music ---------------- */

    startMusic() {
      if (!this.ensure()) return;
      this.musicWanted = true;
      if (this.musicTimer) return;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.12;
      this.musicTimer = setInterval(() => this.scheduleMusic(), 60);
    }

    stopMusic() {
      this.musicWanted = false;
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    scheduleMusic() {
      if (!this.ctx) return;
      const horizon = this.ctx.currentTime + 0.3;
      while (this.nextTime < horizon) {
        const i = this.step % MELODY.length;
        const t = this.nextTime;
        const note = MELODY[i];
        if (note) {
          this.tone(midiToFreq(note), STEP * 0.8, 'square', 0.045, t);
        }
        if (i % 4 === 0) {
          const bass = BASS[(i / 4) % BASS.length];
          this.tone(midiToFreq(bass), STEP * 3.2, 'triangle', 0.07, t);
        }
        if (i % 2 === 1) {
          this.noise(0.025, 0.015, t, 5000);
        }
        this.nextTime += STEP;
        this.step++;
      }
    }
  }

  M.AudioEngine = AudioEngine;
})(window.M);
