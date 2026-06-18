import { Game } from './game.js';
import { AssetLoader } from './asset-loader.js';

function setupLoadingBar() {
  const loadPct = document.getElementById('loadPct');
  const loadBar = document.getElementById('loadBar');
  window._loadingPct = (pct) => {
    if (loadPct) loadPct.textContent = pct + '%';
    if (loadBar) loadBar.style.width = pct + '%';
    if (pct >= 100) {
      setTimeout(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
          overlay.style.opacity = '0';
          setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          }, 500);
        }
      }, 400);
    }
  };
}

async function init() {
  setupLoadingBar();
  const onProgress = window._loadingPct || (() => {});

  let obstacles = [];
  try {
    const res = await fetch('obstacles.json');
    obstacles = await res.json();
  } catch {
    obstacles = [
      'bn1-12-a-2.png', 'bn1-2-b-2.png', 'bn1-2-c-2.png',
      'bv1-1-o-3.png', 'bv2-2-a-3.png', 'bv3-12-a-3.png',
      'bv3-2-b-3.png', 'mn1-2-o-4.png', 'mv2-2-b-3.png',
      'tn1-2-o-4.png',
    ];
  }

  const assets = new AssetLoader();
  await assets.init(obstacles, onProgress);

  const gameArea = document.getElementById('gameArea');
  const canvas = document.getElementById('gameCanvas');
  const styleCanvas = () => {
    const maxW = gameArea.clientWidth;
    const maxH = gameArea.clientHeight;
    const w = 1000;
    const h = 600;
    const dpr = window.devicePixelRatio || 1;
    const ratio = Math.min(maxW / w, maxH / h);
    canvas.width = Math.floor(w * ratio * dpr);
    canvas.height = Math.floor(h * ratio * dpr);
    canvas.style.width = Math.floor(w * ratio) + 'px';
    canvas.style.height = Math.floor(h * ratio) + 'px';
  };
  styleCanvas();
  setTimeout(styleCanvas, 100);

  const game = new Game(assets);
  game.renderLogo();
  document.getElementById('highScoreDisplay').textContent = game.highScore;

  window.addEventListener('resize', styleCanvas);
  window.addEventListener('orientationchange', () => setTimeout(styleCanvas, 100));
}

init();
