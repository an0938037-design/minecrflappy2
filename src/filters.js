import { CONFIG } from './constants.js';

class LowPassFilter {
  constructor(alpha) {
    this.setAlpha(alpha);
    this.y = null;
    this.s = null;
  }

  setAlpha(alpha) {
    if (alpha <= 0 || alpha > 1) throw new Error('Alpha must be in (0.0, 1.0]');
    this.alpha = alpha;
  }

  reset() {
    this.y = null;
    this.s = null;
  }

  filter(value) {
    if (this.y === null) this.s = value;
    else this.s = this.alpha * value + (1 - this.alpha) * this.s;
    this.y = value;
    return this.s;
  }

  lastValue() {
    return this.s;
  }
}

class OneEuroFilter {
  constructor(minCutoff = 1, beta = 0.007, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter(this.alpha(this.minCutoff));
    this.dxFilter = new LowPassFilter(this.alpha(this.dCutoff));
    this.lastTime = null;
  }

  alphaWithDt(cutoff, dt) {
    return 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);
  }

  alpha(cutoff) {
    return this.alphaWithDt(cutoff, 1 / 60);
  }

  reset() {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }

  filter(value) {
    let dt = 1 / 60;
    const now = Date.now();
    if (this.lastTime !== null) {
      dt = (now - this.lastTime) / 1000;
      if (dt <= 0) dt = 1e-4;
    }
    const dx = this.lastTime !== null ? (value - this.xFilter.lastValue()) / dt : 0;
    this.lastTime = now;
    const edx = this.dxFilter.filter(dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    this.xFilter.setAlpha(this.alphaWithDt(cutoff, dt));
    return this.xFilter.filter(value);
  }
}

class HandPositionFilter {
  constructor() {
    this.filterX = new OneEuroFilter(CONFIG.MIN_DETECTION_CONFIDENCE, 0.007, 1);
    this.filterY = new OneEuroFilter(CONFIG.MIN_DETECTION_CONFIDENCE, 0.007, 1);
    this.deadzone = CONFIG.DEADZONE_DISTANCE;
    this.lossTimeout = CONFIG.HAND_LOSS_TIMEOUT;
    this.lastValidPos = null;
    this.lastSeenTime = 0;
    this.isVisible = false;
  }

  update(x, y) {
    const now = Date.now();
    if (x === null || y === null || x === undefined || y === undefined) {
      if (this.isVisible && now - this.lastSeenTime > this.lossTimeout) {
        this.isVisible = false;
        this.filterX.reset();
        this.filterY.reset();
        this.lastValidPos = null;
      }
      return this.isVisible ? { x: this.lastValidPos.x, y: this.lastValidPos.y } : null;
    }

    this.isVisible = true;
    this.lastSeenTime = now;

    if (this.lastValidPos) {
      const dx = x - this.lastValidPos.rawX;
      const dy = y - this.lastValidPos.rawY;
      if (Math.hypot(dx, dy) < this.deadzone) {
        return { x: this.lastValidPos.x, y: this.lastValidPos.y };
      }
    }

    const sx = this.filterX.filter(x);
    const sy = this.filterY.filter(y);
    this.lastValidPos = { x: sx, y: sy, rawX: x, rawY: y };
    return { x: sx, y: sy };
  }

  reset() {
    this.filterX.reset();
    this.filterY.reset();
    this.lastValidPos = null;
    this.lastSeenTime = 0;
    this.isVisible = false;
  }
}

export { LowPassFilter, OneEuroFilter, HandPositionFilter };
