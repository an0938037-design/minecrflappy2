import { CONFIG, GESTURE } from './constants.js';

export class Bird {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.w = 0;
    this.h = 0;
    this.gravity = 0;
    this.jumpFull = 0;
    this.maxFallSpeed = 0;
    this.cooldown = 0;
    this.cooldownMax = CONFIG.COOLDOWN_MAX;
    this.rotation = 0;
    this.wingPhase = 0;
    this.wingTimer = 0;
    this.currentGesture = GESTURE.NONE;
    this.fistBoost = 0;
  }

  init(canvasW, canvasH, size) {
    const s = Math.max(8, size || CONFIG.BIRD_SIZE);
    this.w = s;
    this.h = s;
    this.x = 150;
    this.y = canvasH * 0.35;
    this.vy = 0;
    this.rotation = 0;
    this.wingPhase = 0;
    this.wingTimer = 0;
    const scale = canvasH / 600;
    this.gravity = CONFIG.GRAVITY_SCALE * scale;
    this.jumpFull = CONFIG.JUMP_FULL * scale;
    this.maxFallSpeed = CONFIG.MAX_FALL_SPEED * scale;
    this.cooldown = 0;
    this.currentGesture = GESTURE.NONE;
    this.fistBoost = 0;
    this.prevGesture = GESTURE.NONE;
  }

  flap() {
    if (this.cooldown > 0) return;
    this.vy = this.jumpFull;
    this.cooldown = this.cooldownMax;
  }

  updateGesture(gesture) {
    this.currentGesture = gesture;
    if (gesture === GESTURE.OPEN) {
      this.flap();
      this.fistBoost = 0;
    } else if (gesture === GESTURE.FIST) {
      if (this.prevGesture !== GESTURE.FIST) {
        this.vy = 500;
      }
      this.fistBoost = 1;
    } else {
      this.fistBoost = 0;
    }
    this.prevGesture = gesture;
  }

  update(dt, groundY) {
    this.vy += this.gravity * dt;
    if (this.fistBoost > 0) {
      this.vy += 800 * dt * this.fistBoost;
    }
    if (this.vy > this.maxFallSpeed) this.vy = this.maxFallSpeed;
    this.y += this.vy * dt;
    this.rotation = Math.max(-0.3, Math.min(0.5, this.vy * 0.05));
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.y < 0) { this.y = 0; this.vy = 0; }
    if (groundY !== undefined && this.y + this.h >= groundY) {
      this.y = groundY - this.h;
      this.vy = 0;
      return true;
    }
    this.wingTimer += dt * 1000;
    if (this.wingTimer > CONFIG.WING_FLAP_INTERVAL) {
      this.wingTimer = 0;
      this.wingPhase = (this.wingPhase + 1) % 2;
    }
    return false;
  }

  render(ctx, selectedChar, assets) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rotation);
    const half = this.w / 2;
    const sprite = assets ? assets.getCharacterSprite(selectedChar || 'bee') : null;
    if (sprite) {
      try {
        if (this.wingPhase === 1) {
          ctx.scale(1, 0.7);
        }
        ctx.drawImage(sprite, -half, -half, this.w, this.h);
      } catch {
        this.drawFallback(ctx, half);
      }
    } else {
      this.drawFallback(ctx, half);
    }
    ctx.restore();
  }

  drawFallback(ctx, half) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(half * 0.2, -half * 0.2, half * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(half * 0.25, -half * 0.2, half * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFB347';
    ctx.beginPath();
    ctx.moveTo(half * 0.1, 0);
    ctx.lineTo(half + 5, 0);
    ctx.lineTo(half * 0.1, half * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  getBounds() {
    return { x: this.x + 8, y: this.y + 8, w: this.w - 16, h: this.h - 16 };
  }
}
