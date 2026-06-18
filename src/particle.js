import { CONFIG } from './constants.js';
import { randBetween } from './utils.js';

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = randBetween(-200, 200);
    this.vy = randBetween(-300, -50);
    this.life = 1;
    this.decay = randBetween(1.5, 3.5);
    this.size = randBetween(3, 7);
    this.color = color || '#FFD700';
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 400 * dt;
    this.life -= dt * this.decay;
    this.size *= 0.98;
  }

  render(ctx) {
    if (this.life <= 0) return;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx);
    }
  }

  clear() {
    this.particles = [];
  }
}
