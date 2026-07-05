import { GESTURE } from './constants.js';
import { GestureDetector } from './gesture-detector.js';
import { OneEuroFilter } from './filters.js';
import { HandRenderer } from './hand-renderer.js';

const FILTER_FREQ = 2;
const FILTER_BETA = 0.004;
const NUM_LANDMARKS = 21;

export class HandTracker {
  constructor(options = {}) {
    this.hands = null;
    this.running = false;
    this.smoothedLandmarks = null;
    this.hasHand = false;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    this.filters = null;
    this.gestureDetector = new GestureDetector();
    this.onGesture = options.onGesture || null;
    this.onHandFound = options.onHandFound || null;
    this.onHandLost = options.onHandLost || null;
    this.webcamRafId = null;
    this.handFoundNotified = false;
  }

  async init(camera) {
    try {
      if (typeof Hands === 'undefined') throw new Error('MediaPipe Hands library not loaded');
      this.hands = new Hands({
        locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + f,
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const self = this;
      this.hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const raw = results.multiHandLandmarks[0];
          if (!self.filters) self._initFilters();
          const smoothed = [];
          for (let i = 0; i < NUM_LANDMARKS; i++) {
            smoothed.push({
              x: self.filters[i][0].filter(raw[i].x),
              y: self.filters[i][1].filter(raw[i].y),
              z: raw[i].z,
            });
          }
          self.smoothedLandmarks = smoothed;
          self.hasHand = true;

          if (!self.handFoundNotified) {
            self.handFoundNotified = true;
            self.onHandFound?.();
          }

          const gesture = self.gestureDetector.detect(smoothed);
          self.handState = gesture.gesture;
          self.gestureConfidence = gesture.confidence;
          if (self.onGesture) self.onGesture(gesture);
        } else {
          self._onHandLost();
        }
      });

      camera.onFrame = async (video, shouldProcess) => {
        if (shouldProcess && self.hands && self.running) {
          try { await self.hands.send({ image: video }); } catch {}
        }
      };

      await camera.start();
      this.running = true;
    } catch (e) {
      console.warn('Hand tracking init failed:', e);
      this.running = false;
    }
  }

  _initFilters() {
    this.filters = [];
    for (let i = 0; i < NUM_LANDMARKS; i++) {
      this.filters.push([
        new OneEuroFilter(FILTER_FREQ, FILTER_BETA),
        new OneEuroFilter(FILTER_FREQ, FILTER_BETA),
      ]);
    }
  }

  _onHandLost() {
    this.hasHand = false;
    this.smoothedLandmarks = null;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    this.handFoundNotified = false;
    this.onHandLost?.();
  }

  reset() {
    this.hasHand = false;
    this.smoothedLandmarks = null;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    if (this.filters) {
      for (const pair of this.filters) { pair[0].reset(); pair[1].reset(); }
    }
    this.handFoundNotified = false;
  }

  stop() {
    this.running = false;
    if (this.hands) { try { this.hands.close(); } catch {} }
    this.reset();
  }

  startWebcamRender(canvasId, videoId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const video = document.getElementById(videoId);
    const ctx = canvas.getContext('2d');
    const renderer = new HandRenderer(canvas);
    const self = this;

    const loop = () => {
      if (!self.running || !canvas.offsetWidth) {
        self.webcamRafId = requestAnimationFrame(loop);
        return;
      }
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      if (self.smoothedLandmarks) {
        renderer.render(self.smoothedLandmarks, {
          gesture: self.handState,
          confidence: self.gestureConfidence,
        });
      }
      self.webcamRafId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopWebcamRender() {
    if (this.webcamRafId) { cancelAnimationFrame(this.webcamRafId); this.webcamRafId = null; }
  }
}
