import { CONFIG, HAND_CONNECTIONS, FINGER_COLORS, FINGER_MAP, FINGER_NAMES, JOINT_SIZES, GESTURE_COLORS } from './constants.js';

export class HandRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showLabels = true;
    this.showConfidence = true;
    this.boneWidth = 3;
    this.jointGlow = true;
  }

  render(landmarks, gestureResult) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length < 21) {
      if (gestureResult) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('No hand detected', w / 2, h / 2);
      }
      return;
    }

    this.drawBones(ctx, landmarks, w, h);
    this.drawJoints(ctx, landmarks, w, h);
    this.drawGestureLabel(ctx, landmarks, gestureResult, w, h);
  }

  drawBones(ctx, landmarks, w, h) {
    ctx.lineWidth = this.boneWidth;
    for (const [i, j] of HAND_CONNECTIONS) {
      const fingerIdx = FINGER_MAP[j];
      const color = fingerIdx > 0 && fingerIdx < 6 ? FINGER_COLORS[FINGER_NAMES[fingerIdx]] : '#44FF44';
      const x1 = (1 - landmarks[i].x) * w;
      const y1 = landmarks[i].y * h;
      const x2 = (1 - landmarks[j].x) * w;
      const y2 = landmarks[j].y * h;
      if (this.jointGlow) { ctx.shadowColor = color; ctx.shadowBlur = 6; }
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  drawJoints(ctx, landmarks, w, h) {
    for (let i = 0; i < landmarks.length; i++) {
      const fingerIdx = FINGER_MAP[i];
      let color = fingerIdx > 0 && fingerIdx < 6 ? FINGER_COLORS[FINGER_NAMES[fingerIdx]] : '#FFFFFF';
      if (i === 0) color = '#FFFFFF';
      const x = (1 - landmarks[i].x) * w;
      const y = landmarks[i].y * h;
      const size = JOINT_SIZES[i];
      if (this.jointGlow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  drawGestureLabel(ctx, landmarks, gestureResult, w, h) {
    if (!gestureResult || gestureResult.gesture === 'none' || !this.showLabels) return;
    const base = landmarks[0];
    const x = (1 - base.x) * w;
    const y = base.y * h + 30;
    const color = GESTURE_COLORS[gestureResult.gesture] || '#888888';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = color;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gestureResult.gesture.toUpperCase(), x, y);
    if (this.showConfidence) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(Math.round(gestureResult.confidence * 100) + '%', x, y + 16);
    }
    ctx.shadowBlur = 0;
  }

  destroy() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
