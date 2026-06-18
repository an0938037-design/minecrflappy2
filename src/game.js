import { CONFIG, STATS_KEY, GESTURE } from './constants.js';
import { AssetLoader } from './asset-loader.js';
import { Bird } from './bird.js';
import { Terrain } from './terrain.js';
import { ObstacleManager } from './obstacles.js';
import { Cloud } from './cloud.js';
import { HandTracker } from './hand-tracker.js';
import { Camera } from './camera.js';
import { ParticleSystem } from './particle.js';

export class Game {
  constructor(assets) {
    this.assets = assets;
    this.state = 'menu';
    this.selectedChar = 'bee';
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem(STATS_KEY) || '0', 10);
    this.currentSpeed = CONFIG.BASE_SPEED;
    this.lastTime = 0;
    this.rafId = null;
    this.countdownTimer = null;

    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.logoCanvas = document.getElementById('logoCanvas');
    this.logoCtx = this.logoCanvas.getContext('2d');

    this.bird = new Bird();
    this.terrain = new Terrain();
    this.obstacles = new ObstacleManager();
    this.clouds = [];
    this.particles = new ParticleSystem();

    this.handTracker = null;
    this.camera = null;
    this.handFound = false;

    this.isPaused = false;

    this.setupUI();
    this.setupControls();
  }

  setupControls() {
    this.canvas.addEventListener('click', () => this.handleInput());
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleInput();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.handleInput();
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing') this.togglePause();
        else if (this.state === 'paused') this.togglePause();
      }
      if (e.code === 'KeyR' && this.state === 'gameover') {
        this.quickRestart();
      }
    });
  }

  handleInput() {
    if (this.state === 'gameover') {
      this.hideGameOver();
      this.state = 'menu';
      this.showPlayButton();
      return;
    }
    if (this.state === 'playing') {
      this.bird.flap(true);
    }
    if (this.state === 'paused') {
      this.togglePause();
    }
  }

  setupUI() {
    document.querySelectorAll('.char-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedChar = btn.dataset.char;
        this.renderLogo();
      });
    });

    document.getElementById('playBtn').addEventListener('click', () => this.startGame());
    document.getElementById('btnRestart').addEventListener('click', () => {
      if (this.state === 'gameover' || this.state === 'playing') {
        this.stopEverything();
        this.showPlayButton();
        this.state = 'menu';
      }
    });
    document.getElementById('btnFullscreen').addEventListener('click', () => {
      document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    });
    document.getElementById('btnToggleCam').addEventListener('click', () => this.toggleWebcam());
  }

  toggleWebcam() {
    const camArea = document.getElementById('webcam-area');
    const btn = document.getElementById('btnToggleCam');
    const isHidden = camArea.style.display === 'none';
    camArea.style.display = isHidden ? 'flex' : 'none';
    btn.textContent = isHidden ? '📷 TẮT CAM' : '📷 BẬT CAM';
  }

  togglePause() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    this.isPaused = !this.isPaused;
    this.state = this.isPaused ? 'paused' : 'playing';
    document.getElementById('pauseOverlay').style.display = this.isPaused ? 'block' : 'none';
    if (!this.isPaused) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  renderLogo() {
    const ctx = this.logoCtx;
    ctx.clearRect(0, 0, this.logoCanvas.width, this.logoCanvas.height);
    const logo = this.assets.getCharacterLogo(this.selectedChar);
    if (logo) {
      ctx.drawImage(logo, 0, 0, this.logoCanvas.width, this.logoCanvas.height);
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, this.logoCanvas.width, this.logoCanvas.height);
      ctx.fillStyle = '#ffd700';
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[' + this.selectedChar + ' logo]', this.logoCanvas.width / 2, 45);
    }
  }

  async startGame() {
    this.hideGameOver();
    document.getElementById('playBtn').classList.add('hidden');
    document.getElementById('char-select').style.display = 'none';
    document.getElementById('webcam-area').style.display = 'flex';
    document.getElementById('btnToggleCam').style.display = 'block';

    this.camera = new Camera(document.getElementById('webcamVideo'));
    this.handTracker = new HandTracker({
      onGesture: (gesture) => {
        if (this.state === 'playing') this.bird.updateGesture(gesture.gesture);
      },
      onHandFound: () => { this.handFound = true; },
      onHandLost: () => { this.handFound = false; },
    });

    try {
      await this.handTracker.init(this.camera);
      this.handTracker.startWebcamRender('webcamCanvas', 'webcamVideo');
    } catch (e) {
      console.warn('Camera fallback:', e);
    }

    this.renderLogo();
    this.startCountdown();
  }

  startCountdown() {
    this.state = 'countdown';
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
    let count = 3;
    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const ctx = this.ctx;
    const drawCountdown = () => {
      const dpr = window.devicePixelRatio || 1;
      const scaleX = this.canvas.offsetWidth / cw;
      const scaleY = this.canvas.offsetHeight / ch;
      ctx.save();
      ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#78A7FF';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 80px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#8b6914';
      ctx.shadowBlur = 8;
      if (count > 0) ctx.fillText(count + '...', cw / 2, ch / 2);
      else ctx.fillText('GO!', cw / 2, ch / 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    };
    drawCountdown();
    this.countdownTimer = setInterval(() => {
      count--;
      if (count < 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.beginPlay();
        return;
      }
      drawCountdown();
    }, 1000);
  }

  beginPlay() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.hideGameOver();
    this.state = 'playing';
    this.isPaused = false;
    this.score = 0;
    this.currentSpeed = CONFIG.BASE_SPEED;
    this.particles.clear();

    this.resizeCanvas();

    this.bird.init(CONFIG.CANVAS_W, CONFIG.CANVAS_H, CONFIG.BIRD_SIZE);
    this.terrain.setSeed(Math.floor(Math.random() * 10000), CONFIG.CANVAS_H);
    this.terrain.reset();
    this.obstacles.init();
    this.obstacles.setGroundY(CONFIG.CANVAS_H - CONFIG.GROUND_Y_ROWS * CONFIG.TILE_SIZE);

    this.clouds = [];
    for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
      const cloud = new Cloud();
      cloud.init(CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      this.clouds.push(cloud);
    }

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop(timestamp) {
    if (this.state === 'paused') return;
    this.rafId = requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min((timestamp - this.lastTime) / 1000, CONFIG.FPS_CAP);
    this.lastTime = timestamp;
    this.update(dt);
    this.render();
  }

  get isGameActive() {
    return this.state === 'playing' || this.state === 'gameover' || this.state === 'paused';
  }

  update(dt) {
    if (this.state !== 'playing') return;

    const groundY = CONFIG.CANVAS_H - CONFIG.GROUND_Y_ROWS * CONFIG.TILE_SIZE;
    if (this.bird.update(dt, groundY)) {
      this.gameOver();
      return;
    }

    this.currentSpeed = Math.min(
      CONFIG.MAX_SPEED,
      CONFIG.BASE_SPEED + Math.floor(this.score / CONFIG.SCORE_PER_SPEEDUP) * CONFIG.SPEED_INCREASE_PER_SCORE
    );

    this.terrain.update(dt, this.currentSpeed * 0.5);
    this.obstacles.update(dt, this.currentSpeed);

    const lastObs = this.obstacles.active[this.obstacles.active.length - 1];
    if (!lastObs || lastObs.x + lastObs.dim.w < CONFIG.CANVAS_W) {
      this.obstacles.spawnNext(CONFIG.CANVAS_W, CONFIG.CANVAS_H, this.assets);
    }

    const prevScore = this.score;
    this.score += this.obstacles.getPassed(this.bird.x);
    if (this.score > prevScore) {
      this.particles.emit(this.bird.x, this.bird.y, CONFIG.PARTICLE_ON_SCORE, '#FFD700');
    }

    if (this.obstacles.checkCollision(this.bird.getBounds())) {
      this.gameOver();
      return;
    }

    this.updateUI();

    for (const cloud of this.clouds) {
      cloud.update(dt, this.currentSpeed);
    }
    this.clouds = this.clouds.filter(c => c.x > -200);
    while (this.clouds.length < CONFIG.CLOUD_COUNT) {
      const cloud = new Cloud();
      cloud.init(CONFIG.CANVAS_W, CONFIG.CANVAS_H);
      this.clouds.push(cloud);
    }

    this.particles.update(dt);
  }

  render() {
    const ctx = this.ctx;
    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const displayW = this.canvas.offsetWidth;
    const displayH = this.canvas.offsetHeight;
    if (!displayW || !displayH) return;

    const dpr = window.devicePixelRatio || 1;
    const scaleX = displayW / cw;
    const scaleY = displayH / ch;

    ctx.save();
    ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
    skyGrad.addColorStop(0, '#111147');
    skyGrad.addColorStop(0.7, '#0d0d3d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch);

    for (const cloud of this.clouds) {
      if (cloud.img) ctx.drawImage(cloud.img, cloud.x, cloud.y);
    }

    if (this.isGameActive) {
      this.terrain.render(ctx, cw, ch, this.assets);
      this.obstacles.render(ctx);
      this.bird.render(ctx, this.selectedChar, this.assets);
      this.obstacles.renderFront(ctx);
      this.particles.render(ctx);
    }

    ctx.restore();
  }

  updateUI() {
    document.getElementById('scoreDisplay').textContent = this.score;
    document.getElementById('highScoreDisplay').textContent = this.highScore;
  }

  gameOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.isPaused = false;
    this.stopCamera();

    this.particles.emit(this.bird.x, this.bird.y, CONFIG.PARTICLE_ON_DEATH, '#FF4444');
    this.particles.emit(this.bird.x, this.bird.y, CONFIG.PARTICLE_ON_DEATH, '#FFD700');

    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STATS_KEY, String(this.highScore));
    }

    const ctx = this.ctx;
    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const dpr = window.devicePixelRatio || 1;
    const scaleX = this.canvas.offsetWidth / cw;
    const scaleY = this.canvas.offsetHeight / ch;
    ctx.save();
    ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.fillText('GAME OVER', cw / 2, ch / 2 - 30);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('Score: ' + this.score, cw / 2, ch / 2 + 30);
    ctx.shadowBlur = 0;
    ctx.restore();

    const go = document.getElementById('gameOver');
    if (go) go.style.display = 'block';
    document.getElementById('playBtn').classList.remove('hidden');
    document.getElementById('playBtn').textContent = '↻ PLAY AGAIN';
    document.getElementById('char-select').style.display = 'flex';

    if (this.handTracker) this.handTracker.stop();
  }

  quickRestart() {
    this.stopEverything();
    document.getElementById('playBtn').classList.add('hidden');
    document.getElementById('char-select').style.display = 'none';
    this.startCountdown();
  }

  stopCamera() {
    if (this.handTracker) { this.handTracker.stopWebcamRender(); this.handTracker.stop(); }
    if (this.camera) this.camera.stop();
  }

  stopEverything() {
    this.stopCamera();
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
    document.getElementById('webcam-area').style.display = 'none';
    document.getElementById('btnToggleCam').style.display = 'none';
  }

  showPlayButton() {
    document.getElementById('playBtn').classList.remove('hidden');
    document.getElementById('playBtn').textContent = '▶ PLAY';
    document.getElementById('char-select').style.display = 'flex';
  }

  hideGameOver() {
    const el = document.getElementById('gameOver');
    if (el) el.style.display = 'none';
    document.getElementById('pauseOverlay').style.display = 'none';
  }

  resizeCanvas() {
    const gameArea = document.getElementById('gameArea');
    const maxW = gameArea.clientWidth;
    const maxH = gameArea.clientHeight;
    const w = CONFIG.CANVAS_W;
    const h = CONFIG.CANVAS_H;
    const dpr = window.devicePixelRatio || 1;
    const ratio = Math.min(maxW / w, maxH / h);

    this.canvas.width = Math.floor(w * ratio * dpr);
    this.canvas.height = Math.floor(h * ratio * dpr);
    this.canvas.style.width = Math.floor(w * ratio) + 'px';
    this.canvas.style.height = Math.floor(h * ratio) + 'px';
  }
}
