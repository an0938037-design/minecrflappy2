import { CONFIG, ASSET_PATH, GROUND_TILES, CHARACTERS } from './constants.js';

export class AssetLoader {
  constructor() {
    this.images = {};
    this.obstacles = [];
    this.ready = false;
  }

  loadImage(src, label, useChromaKey) {
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const timeout = setTimeout(() => {
        if (!done) { done = true; resolve(null); }
      }, 5000);
      img.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        if (useChromaKey) {
          try { resolve(removeColorByDistance(img)); } catch { resolve(img); }
        } else {
          resolve(img);
        }
      };
      img.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve(null);
      };
      img.src = src;
    });
  }

  async init(obstacleFiles, onProgress) {
    const total =
      Object.keys(GROUND_TILES).length +
      obstacleFiles.length +
      Object.keys(CHARACTERS).length * 2 +
      4;
    let loaded = 0;

    const progress = (label) => {
      loaded++;
      if (onProgress) onProgress(Math.floor((loaded / total) * 100), label);
    };

    const groundKeys = Object.keys(GROUND_TILES);
    await Promise.all(
      groundKeys.map(async (key) => {
        this.images[key] = await this.loadImage(
          ASSET_PATH + 'ground/' + GROUND_TILES[key], key
        );
        progress(key);
      })
    );

    const obstaclePromises = obstacleFiles.map(async (file) => {
      const parsed = parseObstacleFilename(file);
      if (!parsed) return null;
      const img = await this.loadImage(ASSET_PATH + 'obc/' + file, file, true);
      if (!img) return null;
      const tightBBox = img ? getTightBoundingBox(img) : null;
      return { ...parsed, img, file, tightBBox };
    });

    const obsResults = await Promise.all(obstaclePromises);
    for (const r of obsResults) {
      if (r) {
        this.obstacles.push(r);
        progress(r.file);
      }
    }

    const skeletonImg = await this.loadImage(ASSET_PATH + 'obc/skeleton.png', 'skeleton');
    const skeletonTrimmed = skeletonImg ? makeTransparent(skeletonImg) : null;
    if (skeletonTrimmed) skeletonTrimmed.tightBBox = getTightBoundingBox(skeletonTrimmed);
    this.images.skeleton = skeletonTrimmed;
    progress('skeleton');

    const zombieImg = await this.loadImage(ASSET_PATH + 'obc/zombie.png', 'zombie');
    const zombieTrimmed = zombieImg ? makeTransparent(zombieImg) : null;
    if (zombieTrimmed) zombieTrimmed.tightBBox = getTightBoundingBox(zombieTrimmed);
    this.images.zombie = zombieTrimmed;
    progress('zombie');

    for (const [key, cfg] of Object.entries(CHARACTERS)) {
      this.images['crt_' + key] = await this.loadImage(
        ASSET_PATH + 'crt/' + cfg.crt, key + ' crt', true
      );
      progress(key + ' crt');
      this.images['logo_' + key] = await this.loadImage(
        ASSET_PATH + 'logo/' + cfg.logo, key + ' logo'
      );
      progress(key + ' logo');
    }

    this.images.clouds = await this.loadImage(ASSET_PATH + 'clouds/cloud1.png', 'cloud');
    progress('cloud');

    this.images.hp = await this.loadImage(ASSET_PATH + 'hp.png', 'hp');
    progress('hp');

    this.ready = true;
  }

  getCharacterSprite(char) {
    return this.images['crt_' + char];
  }

  getCharacterLogo(char) {
    return this.images['logo_' + char];
  }

  getGroundTile(key) {
    return this.images[key];
  }
}

function parseObstacleFilename(name) {
  const m = name.match(/^([bmt])([vnd])(\d+)-(\d+)-([a-z])-(\d+)\.png$/);
  if (!m) return null;
  return {
    pos: m[1],
    type: m[2],
    id: parseInt(m[3]),
    chapters: m[4].split('').map(Number),
    group: m[5],
    maxPerZone: parseInt(m[6]),
  };
}

function getTightBoundingBox(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 200) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) return null;
  return { x: minX + 3, y: minY + 3, width: Math.max(1, maxX - minX - 5), height: Math.max(1, maxY - minY - 5) };
}

function makeTransparent(img) {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const pixels = data.data;
  const threshold = 20;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 255 - threshold && pixels[i + 1] > 255 - threshold && pixels[i + 2] > 255 - threshold) {
      pixels[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function removeColorByDistance(img, targetColor, threshold) {
  targetColor = targetColor || [0, 255, 0];
  threshold = threshold || 80;
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const pixels = data.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const dist = Math.hypot(pixels[i] - targetColor[0], pixels[i + 1] - targetColor[1], pixels[i + 2] - targetColor[2]);
    if (dist < threshold) {
      pixels[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
