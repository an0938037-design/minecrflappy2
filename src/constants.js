export const CONFIG = {
  TILE_SIZE: 40,
  TERRAIN_DEPTH: 5,
  GROUND_Y_ROWS: 5,
  CANVAS_W: 1000,
  CANVAS_H: 600,
  BIRD_SIZE: 45,
  GRAVITY_SCALE: 900,
  JUMP_FULL: -380,
  MAX_FALL_SPEED: 500,
  COOLDOWN_MAX: 0.3,
  BASE_SPEED: 200,
  MAX_SPEED: 350,
  SPEED_INCREASE_PER_SCORE: 3,
  SCORE_PER_SPEEDUP: 5,
  OBSTACLE_MIN_GAP: 200,
  MAX_OBSTACLE_WIDTH: 170,
  OBSTACLE_MAX_HEIGHT: 236,
  OBSTACLE_MID_HEIGHT: 159,
  OBSTACLE_TOP_HEIGHT: 184,
  OBSTACLE_SCALE_FACTOR: 0.17,
  CLOUD_COUNT: 6,
  PARTICLE_ON_DEATH: 20,
  PARTICLE_ON_SCORE: 5,
  WING_FLAP_INTERVAL: 150,
  TERRAIN_CLEANUP_DISTANCE: 30,
  FPS_CAP: 0.016,
  DEADZONE_DISTANCE: 2,
  HAND_LOSS_TIMEOUT: 300,
  MIN_DETECTION_CONFIDENCE: 0.5,
  MIN_TRACKING_CONFIDENCE: 0.5,
  EXTEND_THRESHOLD: 0.04,
  THUMB_THRESHOLD: 0.02,
  PINCH_THRESHOLD: 0.05,
};
export const STATS_KEY = 'mf2_highscore';
export const ASSET_PATH = 'pjt1/';
export const CHARACTERS = {
  bee: { crt: 'nvo1.jpg', logo: 'logo1.png', label: 'BEE' },
  parrot: { crt: 'nvo3.png', logo: 'logo3.png', label: 'PARROT' },
  bat: { crt: 'nvo2.png', logo: 'logo2.png', label: 'BAT' },
};
export const GROUND_TILES = {
  gs0: 'gs0.png', gs1: 'gs1.png', dt0: 'dt0.png',
  se0: 'se0.png', cl0: 'cl0.png', in0: 'in0.png',
};
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15],
  [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17],
];
export const FINGER_COLORS = {
  thumb: '#FF4444', index: '#44FF44', middle: '#4488FF',
  ring: '#FFFF44', pinky: '#FF44FF',
};
export const FINGER_MAP = [-1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5];
export const FINGER_NAMES = ['', 'thumb', 'index', 'middle', 'ring', 'pinky'];
export const JOINT_SIZES = [12, 10, 8, 8, 8, 8, 6, 6, 8, 8, 6, 6, 8, 8, 6, 6, 8, 8, 6, 6, 8];
export const FINGER_EXTEND_IDX = [4, 8, 12, 16, 20];
export const FINGER_UPPER_IDX = [3, 6, 10, 14, 18];
export const FINGER_LOWER_IDX = [2, 5, 9, 13, 17];
export const GESTURE = {
  NONE: 'none', OPEN: 'open', FIST: 'fist', PEACE: 'peace',
  POINT: 'point', THUMBS_UP: 'thumbs_up', PINCH: 'pinch',
};
export const TILE_COLORS = {
  se0: '#666', dt0: '#8B6914', cl0: '#333', in0: '#c8a06e',
  gs0: '#4a4', gs1: '#a0845c',
};
export const SPECIAL_OBSTACLES = new Set([
  'bv1-1-o-3.png', 'bv2-2-a-3.png', 'bv3-12-a-3.png', 'bv3-2-b-3.png',
]);
export const OBSTACLE_POSITIONS = ['b', 't', 'b', 'm', 't', 't', 'b'];
export const GESTURE_COLORS = {
  open: '#44FF44', fist: '#FF4444', peace: '#FFFF44',
  point: '#4488FF', thumbs_up: '#44FFFF', pinch: '#FF8800',
  none: '#888888',
};
