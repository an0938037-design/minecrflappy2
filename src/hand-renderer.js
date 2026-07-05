import { HAND_CONNECTIONS, FINGER_COLORS, FINGER_MAP, FINGER_NAMES, GESTURE_COLORS } from './constants.js';

const FINGER_TIP_IDS = [4, 8, 12, 16, 20];
const FINGER_LABELS = ['thumb', 'index', 'mid', 'ring', 'pinky'];

export class HandRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showLabels = true;
    this.showConfidence = true;
  }

  render(landmarks, gestureResult) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!landmarks || landmarks.length < 21) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No hand detected', this.canvas.width / 2, this.canvas.height / 2);
      return;
    }

    this.drawBones(ctx, landmarks);
    this.drawJoints(ctx, landmarks);
    this.drawFingerTips(ctx, landmarks);
    if (gestureResult && gestureResult.gesture !== 'none') {
      this.drawGestureLabel(ctx, landmarks, gestureResult);
    }
  }

  drawBones(ctx, landmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const [i, j] of HAND_CONNECTIONS) {
      const fingerIdx = FINGER_MAP[j];
      const color = fingerIdx > 0 && fingerIdx < 6 ? FINGER_COLORS[FINGER_NAMES[fingerIdx]] : '#44FF44';
      const x1 = (1 - landmarks[i].x) * w;
      const y1 = landmarks[i].y * h;
      const x2 = (1 - landmarks[j].x) * w;
      const y2 = landmarks[j].y * h;

      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawJoints(ctx, landmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < landmarks.length; i++) {
      const fingerIdx = FINGER_MAP[i];
      const color = fingerIdx > 0 && fingerIdx < 6 ? FINGER_COLORS[FINGER_NAMES[fingerIdx]] : '#FFFFFF';
      const x = (1 - landmarks[i].x) * w;
      const y = landmarks[i].y * h;
      const r = i === 0 ? 10 : i % 4 === 0 ? 8 : 6;

      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawFingerTips(ctx, landmarks) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let f = 0; f < 5; f++) {
      const tip = landmarks[FINGER_TIP_IDS[f]];
      const x = (1 - tip.x) * w;
      const y = tip.y * h;
      const color = FINGER_COLORS[FINGER_LABELS[f]];

      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fill();

      if (this.showLabels) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
        ctx.fillText(FINGER_LABELS[f], x, y + 22);
      }
    }
    ctx.shadowBlur = 0;
  }

  drawGestureLabel(ctx, landmarks, gestureResult) {
    if (!this.showLabels && !this.showConfidence) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const wrist = landmarks[0];
    const x = (1 - wrist.x) * w;
    const y = Math.max(24, wrist.y * h - 24);
    const color = GESTURE_COLORS[gestureResult.gesture] || '#888';

    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.font = 'bold 16px monospace';
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
  }
}
