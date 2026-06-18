import { CONFIG, GESTURE } from './constants.js';
import { GestureDetector } from './gesture-detector.js';
import { OneEuroFilter, HandPositionFilter } from './filters.js';
import { Camera } from './camera.js';
import { HandRenderer } from './hand-renderer.js';

export class HandTracker {
  constructor(options = {}) {
    this.hands = null;
    this.running = false;
    this.handLandmarks = null;
    this.smoothedLandmarks = null;
    this.prevSmoothedLandmarks = null;
    this.hasHand = false;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    this.fingerStates = [];
    this.oneEuroFilters = null;
    this.handFilter2D = new HandPositionFilter();
    this.gestureDetector = new GestureDetector();
    this.onResults = options.onResults || null;
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
        locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file,
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: CONFIG.MIN_TRACKING_CONFIDENCE,
      });

      const self = this;
      this.hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const raw = results.multiHandLandmarks[0];
          if (!self.oneEuroFilters) self.initFilters();
          const now = performance.now();
          const smoothed = [];
          for (let i = 0; i < raw.length; i++) {
            const lm = raw[i];
            smoothed.push({
              x: self.oneEuroFilters[i].x.filter(lm.x),
              y: self.oneEuroFilters[i].y.filter(lm.y),
              z: lm.z,
            });
          }
          self.prevSmoothedLandmarks = self.smoothedLandmarks;
          self.smoothedLandmarks = smoothed;
          self.handLandmarks = raw;
          self.hasHand = true;
          if (!self.handFoundNotified) {
            self.handFoundNotified = true;
            if (self.onHandFound) self.onHandFound();
          }
          const gesture = self.gestureDetector.detect(smoothed);
          self.handState = gesture.gesture;
          self.gestureConfidence = gesture.confidence;
          self.fingerStates = gesture.fingerStates;
          if (self.onGesture) self.onGesture(gesture);
          if (self.onResults) self.onResults(self.smoothedLandmarks, gesture);
        } else {
          self.onHandLostInternal();
        }
      });

      camera.onFrame = async (video, shouldProcess) => {
        if (shouldProcess && self.hands && self.running) {
          try { await self.hands.send({ image: video }); } catch { /* ignore */ }
        }
      };

      await camera.start();
      this.running = true;
    } catch (e) {
      console.warn('Hand tracking init failed:', e);
      this.running = false;
    }
  }

  initFilters() {
    this.oneEuroFilters = [];
    for (let i = 0; i < 21; i++) {
      this.oneEuroFilters.push({
        x: new OneEuroFilter(1.5, 0.007),
        y: new OneEuroFilter(1.5, 0.007),
      });
    }
  }

  onHandLostInternal() {
    this.hasHand = false;
    this.handLandmarks = null;
    this.smoothedLandmarks = null;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    this.handFoundNotified = false;
    if (this.onHandLost) this.onHandLost();
  }

  getGesture() {
    return {
      gesture: this.handState,
      confidence: this.gestureConfidence,
      fingerStates: this.fingerStates,
      hasHand: this.hasHand,
      landmarks: this.smoothedLandmarks,
      rawLandmarks: this.handLandmarks,
    };
  }

  reset() {
    this.hasHand = false;
    this.handLandmarks = null;
    this.smoothedLandmarks = null;
    this.prevSmoothedLandmarks = null;
    this.handState = GESTURE.NONE;
    this.gestureConfidence = 0;
    this.fingerStates = [];
    if (this.oneEuroFilters) {
      for (const f of this.oneEuroFilters) { f.x.reset(); f.y.reset(); }
    }
    this.handFilter2D.reset();
    this.handFoundNotified = false;
  }

  stop() {
    this.running = false;
    if (this.hands) { try { this.hands.close(); } catch { /* ignore */ } }
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
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (self.smoothedLandmarks) {
        const gestureInfo = { gesture: self.handState, confidence: self.gestureConfidence };
        renderer.render(self.smoothedLandmarks, gestureInfo);
      }
      self.webcamRafId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopWebcamRender() {
    if (this.webcamRafId) { cancelAnimationFrame(this.webcamRafId); this.webcamRafId = null; }
  }
}
