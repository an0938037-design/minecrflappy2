import { HAND_CONNECTIONS, FINGER_COLORS, FINGER_MAP, FINGER_NAMES, JOINT_SIZES, GESTURE_COLORS } from './constants.js';

const FINGER_TIP_IDS = [4, 8, 12, 16, 20];
const FINGER_LABELS = ['thumb', 'index', 'mid', 'ring', 'pinky'];
const WRIST = 0;
const PALM_CENTER_IDX = 9;

export class HandRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showLabels = true;
    this.showConfidence = true;
    this.boneWidth = 4;
    this.jointGlow = true;
    this._colorCache = new Map();
  }

  _getCachedColor(idx) {
    if (this._colorCache.has(idx)) return this._colorCache.get(idx);
    const fingerIdx = FINGER_MAP[idx];
    const color = fingerIdx > 0 && fingerIdx < 6 ? FINGER_COLORS[FINGER_NAMES[fingerIdx]] : '#FFFFFF';
    this._colorCache.set(idx, color);
    return color;
  }

  render(landmarks, gestureResult) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length < 21) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No hand detected', w / 2, h / 2);
      return;
    }

    this.drawPalm(ctx, landmarks, w, h);
    this.drawBones(ctx, landmarks, w, h);
    this.drawJoints(ctx, landmarks, w, h);
    this.drawFingerTips(ctx, landmarks, w, h);
    if (gestureResult && gestureResult.gesture !== 'none') {
      this.drawGestureLabel(ctx, landmarks, gestureResult, w, h);
    }
  }

  drawPalm(ctx, landmarks, w, h) {
    const wrist = landmarks[WRIST];
    const palm = landmarks[PALM_CENTER_IDX];
    const wx = (1 - wrist.x) * w;
    const wy = wrist.y * h;
    const px = (1 - palm.x) * w;
    const py = palm.y * h;

    ctx.beginPath();
    ctx.ellipse((wx + px) / 2, (wy + py) / 2, 40, 30, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
  }

  drawBones(ctx, landmarks, w, h) {
    ctx.lineWidth = this.boneWidth;
    const len = HAND_CONNECTIONS.length;
    for (let k = 0; k < len; k++) {
      const [i, j] = HAND_CONNECTIONS[k];
      const color = this._getCachedColor(j);
      const x1 = (1 - landmarks[i].x) * w;
      const y1 = landmarks[i].y * h;
      const x2 = (1 - landmarks[j].x) * w;
      const y2 = landmarks[j].y * h;

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawJoints(ctx, landmarks, w, h) {
    for (let i = 0; i < landmarks.length; i++) {
      const x = (1 - landmarks[i].x) * w;
      const y = landmarks[i].y * h;
      const size = JOINT_SIZES[i];
      const color = this._getCachedColor(i);

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawFingerTips(ctx, landmarks, w, h) {
    for (let f = 0; f < 5; f++) {
      const tip = landmarks[FINGER_TIP_IDS[f]];
      const x = (1 - tip.x) * w;
      const y = tip.y * h;
      const color = FINGER_COLORS[FINGER_LABELS[f]];

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fill();

      if (this.showLabels) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(FINGER_LABELS[f], x, y + 20);
      }
    }
  }

  drawGestureLabel(ctx, landmarks, gestureResult, w, h) {
    if (!this.showLabels && !this.showConfidence) return;
    const base = landmarks[WRIST];
    const x = (1 - base.x) * w;
    const y = Math.max(20, base.y * h - 20);
    const color = GESTURE_COLORS[gestureResult.gesture] || '#888';

    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gestureResult.gesture.toUpperCase(), x, y);

    if (this.showConfidence) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px monospace';
      ctx.fillText(Math.round(gestureResult.confidence * 100) + '%', x, y + 18);
    }
    ctx.shadowBlur = 0;
  }

  destroy() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._colorCache.clear();
  }
}
