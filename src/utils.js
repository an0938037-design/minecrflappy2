export function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randBetween(min, max + 1));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createSeededRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967295;
  };
}
