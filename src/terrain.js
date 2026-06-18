import { CONFIG, GROUND_TILES, TILE_COLORS, ASSET_PATH } from './constants.js';
import { createSeededRng } from './utils.js';

const TILE_SIZE = CONFIG.TILE_SIZE;
const DEPTH = CONFIG.TERRAIN_DEPTH;

export class Terrain {
  constructor() {
    this.cols = new Map();
    this.offset = 0;
    this.seed = 0;
    this.rng = null;
    this.groundY = 0;
    this.lastCleanupCol = 0;
  }

  setSeed(seed, canvasH) {
    this.seed = seed;
    this.cols.clear();
    this.rng = createSeededRng(seed);
    this.groundY = canvasH - DEPTH * TILE_SIZE;
  }

  generateColumn() {
    const col = [];
    col[0] = 'se0';
    col[1] = 'se0';
    col[2] = this.rng() < 0.2 ? 'se0' : 'dt0';
    const r = this.rng();
    let tile = 'dt0';
    if (r < 0.1) tile = 'cl0';
    else if (r < 0.05) tile = 'in0';
    col[3] = tile;
    col[4] = this.rng() < 0.1 ? 'gs1' : 'gs0';
    return col;
  }

  getCol(colIndex) {
    if (!this.cols.has(colIndex)) {
      this.cols.set(colIndex, this.generateColumn());
    }
    return this.cols.get(colIndex);
  }

  cleanup(offset) {
    const currentCol = Math.floor(offset / TILE_SIZE);
    const keepRange = CONFIG.TERRAIN_CLEANUP_DISTANCE;
    for (const key of this.cols.keys()) {
      if (Math.abs(key - currentCol) > keepRange) {
        this.cols.delete(key);
      }
    }
  }

  render(ctx, canvasW, canvasH, assets) {
    const colCount = Math.ceil(canvasW / TILE_SIZE) + 4;
    const startCol = Math.floor(this.offset / TILE_SIZE);

    for (let i = -2; i < colCount; i++) {
      const colIdx = startCol + i;
      const tiles = this.getCol(colIdx);
      const x = i * TILE_SIZE - (this.offset % TILE_SIZE);

      for (let j = 0; j < DEPTH; j++) {
        const y = canvasH - (j + 1) * TILE_SIZE;
        const tileKey = tiles[j];
        const img = assets ? assets.getGroundTile(tileKey) : null;
        if (img) {
          try {
            ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
          } catch {
            ctx.fillStyle = '#8B6914';
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        } else {
          ctx.fillStyle = TILE_COLORS[tileKey] || '#555';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }
  }

  update(dt, speed) {
    this.offset += speed * dt;
    this.cleanup(this.offset);
  }

  reset() {
    this.cols.clear();
    this.offset = 0;
  }
}
