import { CONFIG, GESTURE, FINGER_EXTEND_IDX, FINGER_UPPER_IDX, FINGER_LOWER_IDX } from './constants.js';

export class GestureDetector {
  constructor() {
    this.extendThreshold = CONFIG.EXTEND_THRESHOLD;
    this.thumbThreshold = CONFIG.THUMB_THRESHOLD;
    this.pinchThreshold = CONFIG.PINCH_THRESHOLD;
  }

  getFingerDirection(landmarks, tipIdx, pipIdx, dipIdx, mcpIdx) {
    const tip = landmarks[tipIdx];
    const dip = landmarks[dipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    const dir = { x: tip.x - mcp.x, y: tip.y - mcp.y };
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.01) return 0;
    const norm = { x: dir.x / len, y: dir.y / len };
    const base = { x: pip.x - dip.x, y: pip.y - dip.y };
    return base.x * norm.x + base.y * norm.y;
  }

  getThumbDirection(landmarks) {
    const mcp = landmarks[0];
    const pip = landmarks[1];
    const tip = landmarks[2];
    const pinkyMcp = landmarks[4];
    const dir = { x: pip.x - mcp.x, y: pip.y - mcp.y };
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.01) return 0;
    const norm = { x: dir.x / len, y: dir.y / len };
    const toPinky = { x: pinkyMcp.x - tip.x, y: pinkyMcp.y - tip.y };
    return toPinky.x * norm.x + toPinky.y * norm.y;
  }

  getFingerStates(landmarks) {
    const states = [];
    states.push(this.getThumbDirection(landmarks) > this.thumbThreshold);
    for (let i = 0; i < 4; i++) {
      states.push(
        this.getFingerDirection(
          landmarks,
          FINGER_EXTEND_IDX[i + 1],
          FINGER_UPPER_IDX[i + 1],
          FINGER_LOWER_IDX[i + 1],
          0
        ) > this.extendThreshold
      );
    }
    return states;
  }

  detect(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      return { gesture: GESTURE.NONE, confidence: 0, fingerStates: [] };
    }
    const states = this.getFingerStates(landmarks);
    const tip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDist = Math.hypot(indexTip.x - tip.x, indexTip.y - tip.y);
    const extended = states.filter(s => s).length;

    if (pinchDist < this.pinchThreshold) {
      return { gesture: GESTURE.PINCH, confidence: 1 - pinchDist / this.pinchThreshold, fingerStates: states };
    }
    if (extended >= 4) {
      return { gesture: GESTURE.OPEN, confidence: extended / 5, fingerStates: states };
    }
    if (extended <= 1) {
      return { gesture: GESTURE.FIST, confidence: 1 - extended / 5, fingerStates: states };
    }
    if (states[1] && states[2] && !states[3] && !states[4]) {
      return { gesture: GESTURE.PEACE, confidence: 0.8, fingerStates: states };
    }
    if (states[1] && !states[2] && !states[3] && !states[4]) {
      return { gesture: GESTURE.POINT, confidence: 0.7, fingerStates: states };
    }
    if (states[0] && !states[1] && !states[2] && !states[3] && !states[4]) {
      const thumbTip = landmarks[4];
      const indexMcp = landmarks[0];
      if (thumbTip.y < indexMcp.y - 0.05) {
        return { gesture: GESTURE.THUMBS_UP, confidence: 0.8, fingerStates: states };
      }
    }
    return { gesture: GESTURE.NONE, confidence: 0, fingerStates: states };
  }
}
