import { CONFIG } from './constants.js';

const CLOUD_DIAMOND = [
  [0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0],
];

export class Cloud {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.speed = 0;
    this.img = null;
  }

  init(canvasW, canvasH) {
    this.x = randInRange(canvasW, canvasW + 300);
    this.y = randInRange(20, canvasH * 0.3);
    this.speed = randInRange(15, 35);
    this.img = createCloudCanvas(80, 40);
  }

  update(dt, baseSpeed) {
    this.x -= this.speed * dt * baseSpeed / 100;
  }
}

function randInRange(min, max) {
  return min + Math.random() * (max - min);
}

export function createCloudCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const size = Math.max(4, w / 10);
  const rows = CLOUD_DIAMOND.length;
  const cols = CLOUD_DIAMOND[0].length;
  const ox = (w - cols * size) / 2;
  const oy = (h - rows * size) / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (CLOUD_DIAMOND[y][x]) {
        ctx.fillRect(ox + x * size, oy + y * size, size, size);
      }
    }
  }
  return c;
}
