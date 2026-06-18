import { CONFIG, SPECIAL_OBSTACLES, OBSTACLE_POSITIONS } from './constants.js';
import { randInt, randBetween, clamp } from './utils.js';

const MAX_W = CONFIG.MAX_OBSTACLE_WIDTH;
const SCALE_FACTOR = CONFIG.OBSTACLE_SCALE_FACTOR;
const HEIGHTS = { b: CONFIG.OBSTACLE_MAX_HEIGHT, m: CONFIG.OBSTACLE_MID_HEIGHT, t: CONFIG.OBSTACLE_TOP_HEIGHT };
const MIN_GAP = CONFIG.OBSTACLE_MIN_GAP;
const TILE_SIZE = CONFIG.TILE_SIZE;

export class ObstacleManager {
  constructor() {
    this.active = [];
    this.posCycle = 0;
    this.lastMidY = undefined;
    this.groundY = 0;
  }

  setGroundY(y) {
    this.groundY = y;
  }

  getScaledDims(obstacleData, canvasH, pos) {
    let scale = 1;
    if (SPECIAL_OBSTACLES.has(obstacleData.file)) {
      if (obstacleData.file === 'bv3-12-a-3.png') scale = 1.8;
      else if (obstacleData.file === 'bv3-2-b-3.png') scale = 1.8;
      else if (obstacleData.file === 'bv2-2-a-3.png') scale = 1.1;
      else scale = 1.5;
    }
    const maxW = Math.min(MAX_W, Math.floor(canvasH * SCALE_FACTOR)) * scale;
    const imgW = obstacleData.img.naturalWidth || obstacleData.img.width || 50;
    const imgH = obstacleData.img.naturalHeight || obstacleData.img.height || 50;
    let w = Math.min(maxW, imgW);
    let h = (w * imgH) / imgW;
    const maxH = (HEIGHTS[pos] || CONFIG.OBSTACLE_MAX_HEIGHT) * scale;
    if (h > maxH * scale) { h = maxH * scale; w = (h * imgW) / imgH; }
    return { w, h };
  }

  init() {
    this.active = [];
    this.posCycle = 0;
    this.lastMidY = undefined;
  }

  spawnNext(canvasW, canvasH, assets) {
    if (!assets || !assets.obstacles || !assets.obstacles.length) return;

    const pos = OBSTACLE_POSITIONS[this.posCycle % OBSTACLE_POSITIONS.length];
    this.posCycle++;

    const candidates = assets.obstacles.filter(o => o.img && o.pos === pos);
    if (!candidates.length) return;

    const pool = [];
    for (const c of candidates) {
      const count = c.type === 'n' ? 5 : 1;
      for (let i = 0; i < count; i++) pool.push(c);
    }
    const data = pool[randInt(0, pool.length - 1)];
    const dim = this.getScaledDims(data, canvasH, data.pos);
    const groundY = this.groundY || canvasH - 5 * TILE_SIZE;

    const last = this.active[this.active.length - 1];
    let x = last ? last.x + last.dim.w + MIN_GAP : canvasW + 80;
    if (x < canvasW) x = canvasW + 50;

    let y;
    switch (data.pos) {
      case 'b':
        y = clamp(groundY - dim.h, 0, groundY - dim.h);
        break;
      case 'm': {
        const maxY = groundY - dim.h - 55;
        let yy;
        if (this.lastMidY !== undefined) {
          do { yy = randBetween(55, maxY); } while (Math.abs(yy - this.lastMidY) < 80);
        } else {
          yy = randBetween(55, maxY);
        }
        this.lastMidY = yy;
        y = yy;
        break;
      }
      case 't':
        y = 0;
        break;
    }

    const obstacle = {
      data,
      img: data.img,
      x, y, dim,
      passed: false,
      rider: null,
    };

    if (data.pos === 'b' && assets.images.skeleton && assets.images.zombie && Math.random() < 0.5) {
      const isSkeleton = Math.random() < 0.5;
      const riderImg = isSkeleton ? assets.images.skeleton : assets.images.zombie;
      const riderW = 84;
      const riderH = isSkeleton ? 88 : 112;
      let riderY = dim.h + riderH;
      const maxRiderY = groundY * 0.65;
      if (riderY > maxRiderY) {
        const m = maxRiderY / riderY;
        obstacle.dim = { w: dim.w * m, h: dim.h * m };
        obstacle.y = groundY - obstacle.dim.h;
      }
      obstacle.rider = { type: isSkeleton ? 'skeleton' : 'zombie', img: riderImg, w: riderW, h: riderH, y: obstacle.y - riderH };
    }

    this.active.push(obstacle);
  }

  update(dt, speed) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].x -= speed * dt;
      if (this.active[i].x + this.active[i].dim.w < -100) {
        this.active.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const obs of this.active) {
      if (obs.data.pos === 'b') continue;
      if (obs.img) {
        ctx.drawImage(obs.img, obs.x, obs.y, obs.dim.w, obs.dim.h);
      } else {
        ctx.fillStyle = '#888';
        ctx.fillRect(obs.x, obs.y, obs.dim.w, obs.dim.h);
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial, sans-serif';
        ctx.fillText('[' + obs.data.pos + obs.data.type + ']', obs.x + 5, obs.y + obs.dim.h / 2);
      }
    }
  }

  renderFront(ctx) {
    for (const obs of this.active) {
      if (obs.data.pos === 'b' && obs.img) {
        ctx.drawImage(obs.img, obs.x, obs.y, obs.dim.w, obs.dim.h);
      }
      if (obs.rider) {
        ctx.drawImage(
          obs.rider.img,
          obs.x + (obs.dim.w - obs.rider.w) / 2,
          obs.rider.y,
          obs.rider.w,
          obs.rider.h
        );
      }
    }
  }

  checkCollision(birdBounds) {
    const b = birdBounds;
    for (const obs of this.active) {
      const tight = obs.data.tightBBox;
      const padding = 20;
      if (tight) {
        const sx = obs.dim.w / (obs.img.naturalWidth || obs.img.width || obs.dim.w);
        const sy = obs.dim.h / (obs.img.naturalHeight || obs.img.height || obs.dim.h);
        const ox = obs.x + tight.x * sx + padding;
        const oy = obs.y + tight.y * sy + padding;
        const ow = Math.max(1, tight.width * sx - padding * 2);
        const oh = Math.max(1, tight.height * sy - padding * 2);
        if (b.x < ox + ow && b.x + b.w > ox && b.y < oy + oh && b.y + b.h > oy) return obs;
      } else {
        if (b.x + padding < obs.x + obs.dim.w - padding &&
            b.x + b.w - padding > obs.x + padding &&
            b.y + padding < obs.y + obs.dim.h - padding &&
            b.y + b.h - padding > obs.y + padding) return obs;
      }

      if (obs.rider) {
        const rx = obs.x + (obs.dim.w - obs.rider.w) / 2;
        const rt = obs.rider.img.tightBBox;
        const pad = 8;
        if (rt) {
          const sx = obs.rider.w / (obs.rider.img.width || obs.rider.w);
          const sy = obs.rider.h / (obs.rider.img.height || obs.rider.h);
          const ox = rx + rt.x * sx + pad;
          const oy = obs.rider.y + rt.y * sy + pad;
          const ow = Math.max(1, rt.width * sx - pad * 2);
          const oh = Math.max(1, rt.height * sy - pad * 2);
          if (b.x < ox + ow && b.x + b.w > ox && b.y < oy + oh && b.y + b.h > oy) return obs;
        } else {
          if (b.x < rx + obs.rider.w - pad && b.x + b.w > rx + pad &&
              b.y < obs.rider.y + obs.rider.h - pad && b.y + b.h > obs.rider.y + pad) return obs;
        }
      }
    }
    return null;
  }

  getPassed(playerX) {
    let count = 0;
    for (const obs of this.active) {
      if (!obs.passed && obs.x + obs.dim.w < playerX) {
        obs.passed = true;
        count++;
      }
    }
    return count;
  }
}
