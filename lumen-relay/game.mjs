import {
  SIGNALS,
  chooseSpawnPoint,
  circlesOverlap,
  clamp,
  deliveryScore,
  difficultyFor,
  formatScore,
  lerp,
  mulberry32,
  normalize,
} from './core.mjs';
import { SoundEngine } from './audio.mjs';

const BEST_KEY = 'lumen-relay:best';
const ROUND_SECONDS = 90;
const MAX_INTEGRITY = 3;
const DASH_COOLDOWN = 1.55;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const elements = {
  canvas: document.querySelector('#gameCanvas'),
  frame: document.querySelector('.game-frame'),
  overlay: document.querySelector('#gameOverlay'),
  overlayEyebrow: document.querySelector('#overlayEyebrow'),
  overlayTitle: document.querySelector('#overlayTitle'),
  overlayCopy: document.querySelector('#overlayCopy'),
  signalKey: document.querySelector('.signal-key'),
  resultGrid: document.querySelector('#resultGrid'),
  primaryButton: document.querySelector('#primaryButton'),
  score: document.querySelector('#scoreValue'),
  best: document.querySelector('#bestValue'),
  combo: document.querySelector('#comboValue'),
  integrity: document.querySelector('#integrityValue'),
  wave: document.querySelector('#waveValue'),
  time: document.querySelector('#timeValue'),
  dashFill: document.querySelector('#dashFill'),
  dashButton: document.querySelector('#dashButton'),
  pauseButton: document.querySelector('#pauseButton'),
  soundButton: document.querySelector('#soundButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  instructionsButton: document.querySelector('#instructionsButton'),
  instructionsDialog: document.querySelector('#instructionsDialog'),
  announcement: document.querySelector('#announcement'),
  liveStatus: document.querySelector('#liveStatus'),
  finalScore: document.querySelector('#finalScore'),
  finalCombo: document.querySelector('#finalCombo'),
  finalDeliveries: document.querySelector('#finalDeliveries'),
};

if (!elements.canvas) throw new Error('Lumen Relay could not find its canvas element.');

const context = elements.canvas.getContext('2d', { alpha: false });
if (!context) throw new Error('Lumen Relay requires Canvas 2D support.');

const sound = new SoundEngine();
const input = {
  keys: new Set(),
  pointerActive: false,
  pointerId: null,
  target: { x: 0, y: 0 },
};

const world = {
  width: 1280,
  height: 720,
  dpr: 1,
  stars: [],
};

function readBestScore() {
  try {
    return Math.max(0, Number.parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem(BEST_KEY, String(Math.max(0, Math.round(value))));
  } catch {
    // A disabled storage layer should never stop the game.
  }
}

function createState() {
  return {
    phase: 'intro',
    score: 0,
    best: readBestScore(),
    combo: 0,
    bestCombo: 0,
    deliveries: 0,
    integrity: MAX_INTEGRITY,
    time: ROUND_SECONDS,
    elapsed: 0,
    wave: 1,
    spawnTimer: 0,
    lastCountdownSecond: 99,
    carrying: null,
    packets: [],
    interference: [],
    particles: [],
    floatingTexts: [],
    gates: [],
    shake: 0,
    flash: 0,
    random: mulberry32(Date.now()),
    player: {
      x: world.width / 2,
      y: world.height / 2,
      vx: 0,
      vy: 0,
      radius: 13,
      facingX: 1,
      facingY: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnerable: 0,
      hitLock: 0,
      trailTimer: 0,
      trail: [],
    },
  };
}

let state = createState();
let lastFrame = performance.now();

function layoutGates() {
  const edge = clamp(Math.min(world.width, world.height) * 0.095, 54, 82);
  const bottom = clamp(Math.min(world.width, world.height) * 0.1, 55, 88);
  const positions = world.width < 700
    ? [
        { x: edge, y: world.height * 0.31, angle: 0 },
        { x: world.width - edge, y: world.height * 0.31, angle: Math.PI },
        { x: world.width / 2, y: world.height - bottom, angle: -Math.PI / 2 },
      ]
    : [
        { x: edge, y: world.height * 0.38, angle: 0 },
        { x: world.width - edge, y: world.height * 0.38, angle: Math.PI },
        { x: world.width / 2, y: world.height - bottom, angle: -Math.PI / 2 },
      ];

  state.gates = SIGNALS.map((signal, index) => ({
    ...positions[index],
    radius: clamp(Math.min(world.width, world.height) * 0.048, 29, 43),
    signal,
    pulse: state.gates[index]?.pulse ?? 0,
  }));
}

function rebuildStars() {
  const random = mulberry32(20260829);
  const count = reducedMotion ? 45 : clamp(Math.round((world.width * world.height) / 10000), 55, 135);
  world.stars = Array.from({ length: count }, () => ({
    x: random() * world.width,
    y: random() * world.height,
    radius: 0.35 + random() * 1.15,
    alpha: 0.12 + random() * 0.45,
    depth: 0.25 + random() * 0.75,
  }));
}

function resizeCanvas() {
  const rect = elements.frame.getBoundingClientRect();
  const previousWidth = world.width;
  const previousHeight = world.height;
  world.width = Math.max(320, rect.width);
  world.height = Math.max(360, rect.height);
  world.dpr = Math.min(window.devicePixelRatio || 1, 2);
  elements.canvas.width = Math.round(world.width * world.dpr);
  elements.canvas.height = Math.round(world.height * world.dpr);
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);

  const scaleX = previousWidth ? world.width / previousWidth : 1;
  const scaleY = previousHeight ? world.height / previousHeight : 1;
  state.player.x = clamp(state.player.x * scaleX, 30, world.width - 30);
  state.player.y = clamp(state.player.y * scaleY, 30, world.height - 30);
  for (const item of [...state.packets, ...state.interference]) {
    item.x = clamp(item.x * scaleX, 24, world.width - 24);
    item.y = clamp(item.y * scaleY, 24, world.height - 24);
  }
  layoutGates();
  rebuildStars();
}

function showOverlay({ eyebrow, title, copy, action, mode = 'intro' }) {
  elements.overlayEyebrow.textContent = eyebrow;
  elements.overlayTitle.textContent = title;
  elements.overlayCopy.textContent = copy;
  elements.primaryButton.textContent = action;
  elements.resultGrid.hidden = mode !== 'result';
  elements.signalKey.hidden = mode !== 'intro';
  elements.overlay.classList.add('is-visible');
}

function hideOverlay() {
  elements.overlay.classList.remove('is-visible');
}

function announce(message, accessible = false) {
  elements.announcement.textContent = message;
  elements.announcement.classList.remove('show');
  void elements.announcement.offsetWidth;
  elements.announcement.classList.add('show');
  if (accessible) elements.liveStatus.textContent = message;
}

function setSoundButton() {
  elements.soundButton.textContent = `Sound: ${sound.enabled ? 'on' : 'off'}`;
  elements.soundButton.setAttribute('aria-pressed', String(sound.enabled));
}

function startRun() {
  sound.unlock();
  const best = Math.max(state.best, readBestScore());
  state = createState();
  state.phase = 'playing';
  state.best = best;
  state.random = mulberry32((Date.now() ^ Math.round(performance.now() * 1000)) >>> 0);
  state.player.x = world.width / 2;
  state.player.y = world.height * 0.53;
  state.spawnTimer = 0.12;
  layoutGates();
  spawnPacket(SIGNALS[0]);
  spawnPacket(SIGNALS[1]);
  ensureInterference();
  input.keys.clear();
  input.pointerActive = false;
  hideOverlay();
  elements.canvas.focus({ preventScroll: true });
  elements.liveStatus.textContent = 'Run started. Ninety seconds remaining.';
  lastFrame = performance.now();
  updateHud();
}

function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  input.keys.clear();
  input.pointerActive = false;
  showOverlay({
    eyebrow: 'Signal held',
    title: 'Run paused.',
    copy: 'The field is frozen. Resume when you are ready.',
    action: 'Resume',
    mode: 'pause',
  });
  elements.liveStatus.textContent = 'Game paused.';
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing';
  hideOverlay();
  elements.canvas.focus({ preventScroll: true });
  elements.liveStatus.textContent = 'Game resumed.';
  lastFrame = performance.now();
}

function togglePause() {
  if (state.phase === 'playing') pauseGame();
  else if (state.phase === 'paused') resumeGame();
}

function endRun(reason) {
  if (state.phase !== 'playing') return;
  state.phase = 'gameover';
  input.keys.clear();
  input.pointerActive = false;
  state.best = Math.max(state.best, state.score);
  saveBestScore(state.best);
  elements.finalScore.textContent = formatScore(state.score);
  elements.finalCombo.textContent = `×${Math.max(1, state.bestCombo)}`;
  elements.finalDeliveries.textContent = String(state.deliveries);
  const completed = reason === 'time';
  showOverlay({
    eyebrow: completed ? 'Run complete' : 'Connection lost',
    title: completed ? 'Field stabilized.' : 'The signal broke.',
    copy: completed
      ? `${state.deliveries} fragments reached their gates across ${state.wave} wave${state.wave === 1 ? '' : 's'}.`
      : `The field reached wave ${state.wave}. Use the gate symbols and save dash for crowded crossings.`,
    action: 'Run again',
    mode: 'result',
  });
  sound.gameOver();
  elements.liveStatus.textContent = `Run ended. Final score ${formatScore(state.score)}. ${state.deliveries} fragments delivered.`;
  updateHud();
}

function inputDirection() {
  let x = 0;
  let y = 0;
  if (input.keys.has('arrowleft') || input.keys.has('a')) x -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) x += 1;
  if (input.keys.has('arrowup') || input.keys.has('w')) y -= 1;
  if (input.keys.has('arrowdown') || input.keys.has('s')) y += 1;

  if (!x && !y && input.pointerActive) {
    const toTarget = normalize(input.target.x - state.player.x, input.target.y - state.player.y);
    if (toTarget.length > 8) {
      x = toTarget.x;
      y = toTarget.y;
    }
  }
  return normalize(x, y);
}

function requestDash() {
  if (state.phase !== 'playing' || state.player.dashCooldown > 0) return;
  sound.unlock();
  state.player.dashTimer = 0.19;
  state.player.dashCooldown = DASH_COOLDOWN;
  state.player.invulnerable = Math.max(state.player.invulnerable, 0.24);
  state.shake = Math.max(state.shake, 2.5);
  burst(state.player.x, state.player.y, '#5de4ff', reducedMotion ? 5 : 14, 120, 0.35);
  sound.dash();
}

function spawnPacket(forcedSignal = null) {
  const difficulty = difficultyFor(state.deliveries);
  const signal = forcedSignal || SIGNALS[Math.floor(state.random() * SIGNALS.length)];
  const avoid = [
    { x: state.player.x, y: state.player.y, radius: state.player.radius, clearance: 115 },
    ...state.gates.map((gate) => ({ ...gate, clearance: 80 })),
    ...state.packets.map((packet) => ({ ...packet, clearance: 42 })),
    ...state.interference.map((item) => ({ ...item, clearance: 35 })),
  ];
  const point = chooseSpawnPoint({
    width: world.width,
    height: world.height,
    margin: clamp(Math.min(world.width, world.height) * 0.14, 72, 115),
    avoid,
    random: state.random,
  });
  state.packets.push({
    x: point.x,
    y: point.y,
    radius: 11,
    signal,
    lifetime: difficulty.packetLifetime,
    maxLifetime: difficulty.packetLifetime,
    phase: state.random() * Math.PI * 2,
    born: 0,
  });
  burst(point.x, point.y, signal.color, reducedMotion ? 3 : 8, 42, 0.42);
}

function spawnInterference() {
  const difficulty = difficultyFor(state.deliveries);
  const side = Math.floor(state.random() * 4);
  const padding = 30;
  let x;
  let y;
  if (side === 0) { x = padding; y = padding + state.random() * (world.height - padding * 2); }
  else if (side === 1) { x = world.width - padding; y = padding + state.random() * (world.height - padding * 2); }
  else if (side === 2) { x = padding + state.random() * (world.width - padding * 2); y = padding; }
  else { x = padding + state.random() * (world.width - padding * 2); y = world.height - padding; }
  const towardCenter = normalize(world.width / 2 - x, world.height / 2 - y);
  const speed = difficulty.interferenceSpeed * (0.82 + state.random() * 0.32);
  state.interference.push({
    x,
    y,
    radius: 12 + state.random() * 5,
    vx: towardCenter.x * speed,
    vy: towardCenter.y * speed,
    speed,
    phase: state.random() * Math.PI * 2,
    spin: (state.random() > 0.5 ? 1 : -1) * (0.55 + state.random() * 0.6),
    dashTouched: 0,
  });
}

function ensureInterference() {
  const target = difficultyFor(state.deliveries).interferenceCount;
  while (state.interference.length < target) spawnInterference();
}

function pickupPacket(packet) {
  state.carrying = packet;
  state.packets = state.packets.filter((candidate) => candidate !== packet);
  state.floatingTexts.push({ x: packet.x, y: packet.y - 10, text: packet.signal.label, color: packet.signal.color, life: 0.75, maxLife: 0.75 });
  burst(packet.x, packet.y, packet.signal.color, reducedMotion ? 4 : 11, 75, 0.42);
  sound.pickup();
}

function deliverPacket(gate) {
  const packet = state.carrying;
  if (!packet) return;
  const result = deliveryScore({
    combo: state.combo,
    lifetime: packet.lifetime,
    maxLifetime: packet.maxLifetime,
  });
  const waveBonus = (state.wave - 1) * 18;
  const points = result.points + waveBonus;
  const previousWave = state.wave;
  state.score += points;
  state.combo = result.nextCombo;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.deliveries += 1;
  state.wave = difficultyFor(state.deliveries).wave;
  state.carrying = null;
  gate.pulse = 1;
  state.shake = Math.max(state.shake, 4);
  state.floatingTexts.push({ x: gate.x, y: gate.y - gate.radius - 8, text: `+${points}`, color: packet.signal.color, life: 1, maxLife: 1 });
  burst(gate.x, gate.y, packet.signal.color, reducedMotion ? 7 : 24, 170, 0.72);
  sound.deliver(state.combo);
  if (state.wave > previousWave) {
    announce(`Wave ${state.wave}`, true);
    sound.wave();
    ensureInterference();
  }
  state.spawnTimer = Math.min(state.spawnTimer, 0.28);
}

function damagePlayer(source) {
  if (state.player.invulnerable > 0 || state.player.hitLock > 0) return;
  state.integrity -= 1;
  state.combo = 0;
  state.player.hitLock = 1.1;
  state.player.invulnerable = 1.1;
  state.flash = 0.35;
  state.shake = 14;
  const away = normalize(state.player.x - source.x, state.player.y - source.y);
  state.player.vx = away.x * 330;
  state.player.vy = away.y * 330;
  if (state.carrying) {
    const dropped = state.carrying;
    dropped.x = clamp(state.player.x + away.x * 34, 35, world.width - 35);
    dropped.y = clamp(state.player.y + away.y * 34, 35, world.height - 35);
    dropped.lifetime = Math.max(dropped.lifetime, 3.2);
    state.packets.push(dropped);
    state.carrying = null;
  }
  state.floatingTexts.push({ x: state.player.x, y: state.player.y - 26, text: 'Integrity −1', color: '#ff5d7d', life: 1.05, maxLife: 1.05 });
  burst(state.player.x, state.player.y, '#ff5d7d', reducedMotion ? 8 : 28, 210, 0.7);
  sound.hit();
  if (state.integrity <= 0) endRun('integrity');
}

function updatePlayer(delta) {
  const player = state.player;
  player.dashTimer = Math.max(0, player.dashTimer - delta);
  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.hitLock = Math.max(0, player.hitLock - delta);
  const direction = inputDirection();
  if (direction.length > 0) {
    player.facingX = direction.x;
    player.facingY = direction.y;
  }
  const baseSpeed = clamp(Math.min(world.width, world.height) * 0.48, 225, 345);
  const multiplier = player.dashTimer > 0 ? 2.45 : 1;
  const targetVx = direction.x * baseSpeed * multiplier;
  const targetVy = direction.y * baseSpeed * multiplier;
  const response = 1 - Math.exp(-delta * (player.dashTimer > 0 ? 24 : 13));
  player.vx = lerp(player.vx, targetVx, response);
  player.vy = lerp(player.vy, targetVy, response);
  if (direction.length === 0) {
    const drag = Math.exp(-delta * 7.5);
    player.vx *= drag;
    player.vy *= drag;
  }
  player.x += player.vx * delta;
  player.y += player.vy * delta;
  const margin = player.radius + 12;
  if (player.x < margin || player.x > world.width - margin) player.vx *= -0.25;
  if (player.y < margin || player.y > world.height - margin) player.vy *= -0.25;
  player.x = clamp(player.x, margin, world.width - margin);
  player.y = clamp(player.y, margin, world.height - margin);

  player.trailTimer -= delta;
  if (player.trailTimer <= 0 && (!reducedMotion || player.dashTimer > 0)) {
    player.trail.unshift({ x: player.x, y: player.y, life: player.dashTimer > 0 ? 0.42 : 0.22, maxLife: player.dashTimer > 0 ? 0.42 : 0.22 });
    player.trailTimer = player.dashTimer > 0 ? 0.018 : 0.045;
  }
  for (const trail of player.trail) trail.life -= delta;
  player.trail = player.trail.filter((trail) => trail.life > 0).slice(0, 30);
}

function updatePackets(delta) {
  const difficulty = difficultyFor(state.deliveries);
  const maxPackets = clamp(2 + Math.floor(state.wave / 2), 2, 6);
  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0 && state.packets.length + (state.carrying ? 1 : 0) < maxPackets) {
    spawnPacket();
    state.spawnTimer = difficulty.packetInterval * (0.82 + state.random() * 0.36);
  }

  for (const packet of state.packets) {
    packet.born += delta;
    packet.phase += delta * 1.8;
    packet.lifetime -= delta;
    if (!state.carrying && circlesOverlap(state.player, packet, 2)) pickupPacket(packet);
  }

  const expired = state.packets.filter((packet) => packet.lifetime <= 0);
  for (const packet of expired) {
    burst(packet.x, packet.y, packet.signal.color, reducedMotion ? 2 : 7, 60, 0.36);
    if (state.combo > 0) state.combo = 0;
  }
  state.packets = state.packets.filter((packet) => packet.lifetime > 0 && packet !== state.carrying);

  if (state.carrying) {
    state.carrying.lifetime = Math.max(0, state.carrying.lifetime - delta * 0.35);
    const matchingGate = state.gates.find((gate) => gate.signal.id === state.carrying.signal.id);
    if (matchingGate && circlesOverlap(state.player, matchingGate, 2)) deliverPacket(matchingGate);
  }
}

function updateInterference(delta) {
  ensureInterference();
  const difficulty = difficultyFor(state.deliveries);
  for (const item of state.interference) {
    item.phase += delta * item.spin;
    item.dashTouched = Math.max(0, item.dashTouched - delta);
    const desired = normalize(state.player.x - item.x, state.player.y - item.y);
    const targetSpeed = difficulty.interferenceSpeed * (0.92 + (item.radius - 12) * 0.02);
    const steer = 1 - Math.pow(1 - difficulty.steering, delta * 60);
    item.vx = lerp(item.vx, desired.x * targetSpeed, steer);
    item.vy = lerp(item.vy, desired.y * targetSpeed, steer);
    item.x += item.vx * delta;
    item.y += item.vy * delta;
    const margin = item.radius + 8;
    if (item.x < margin || item.x > world.width - margin) item.vx *= -1;
    if (item.y < margin || item.y > world.height - margin) item.vy *= -1;
    item.x = clamp(item.x, margin, world.width - margin);
    item.y = clamp(item.y, margin, world.height - margin);

    if (circlesOverlap(state.player, item, -2)) {
      if (state.player.dashTimer > 0) {
        if (item.dashTouched <= 0) {
          const away = normalize(item.x - state.player.x, item.y - state.player.y);
          item.vx = away.x * targetSpeed * 1.8;
          item.vy = away.y * targetSpeed * 1.8;
          item.dashTouched = 0.35;
          burst(item.x, item.y, '#5de4ff', reducedMotion ? 3 : 9, 110, 0.35);
        }
      } else {
        damagePlayer(item);
      }
    }
  }
}

function burst(x, y, color, count, speed, life) {
  const actualCount = reducedMotion ? Math.min(count, 8) : count;
  for (let index = 0; index < actualCount; index += 1) {
    const angle = state.random() * Math.PI * 2;
    const velocity = speed * (0.35 + state.random() * 0.65);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: life * (0.55 + state.random() * 0.6),
      maxLife: life,
      size: 1 + state.random() * 2.8,
      color,
    });
  }
}

function updateEffects(delta) {
  state.shake = Math.max(0, state.shake - delta * 26);
  state.flash = Math.max(0, state.flash - delta);
  for (const gate of state.gates) gate.pulse = Math.max(0, gate.pulse - delta * 1.6);
  for (const particle of state.particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.exp(-delta * 3.2);
    particle.vy *= Math.exp(-delta * 3.2);
  }
  state.particles = state.particles.filter((particle) => particle.life > 0).slice(-520);
  for (const text of state.floatingTexts) {
    text.life -= delta;
    text.y -= delta * 30;
  }
  state.floatingTexts = state.floatingTexts.filter((text) => text.life > 0);
}

function update(delta) {
  state.elapsed += delta;
  state.time = Math.max(0, state.time - delta);
  const wholeSecond = Math.ceil(state.time);
  if (wholeSecond <= 5 && wholeSecond > 0 && wholeSecond !== state.lastCountdownSecond) {
    state.lastCountdownSecond = wholeSecond;
    sound.countdown();
    announce(String(wholeSecond));
  }
  updatePlayer(delta);
  updatePackets(delta);
  if (state.phase !== 'playing') return;
  updateInterference(delta);
  updateEffects(delta);
  if (state.time <= 0) endRun('time');
  updateHud();
}

function updateHud() {
  const multiplier = 1 + Math.max(0, state.combo - 1) * 0.25;
  const integrityText = `${'◆ '.repeat(Math.max(0, state.integrity))}${'◇ '.repeat(Math.max(0, MAX_INTEGRITY - state.integrity))}`.trim();
  elements.score.textContent = formatScore(state.score);
  elements.best.textContent = formatScore(Math.max(state.best, state.score));
  elements.combo.textContent = `×${multiplier.toFixed(2)}`;
  elements.integrity.textContent = integrityText;
  elements.integrity.setAttribute('aria-label', `${state.integrity} integrity remaining`);
  elements.wave.textContent = `Wave ${state.wave}`;
  elements.time.textContent = state.time.toFixed(1);
  const dashReady = clamp(1 - state.player.dashCooldown / DASH_COOLDOWN, 0, 1);
  elements.dashFill.style.transform = `scaleX(${dashReady})`;
  elements.dashButton.disabled = dashReady < 0.999 || state.phase !== 'playing';
  elements.dashButton.textContent = dashReady >= 0.999 ? 'Dash' : `${Math.max(0, state.player.dashCooldown).toFixed(1)}`;
}

function drawSignalShape(signalId, x, y, size, color, filled = false) {
  context.save();
  context.translate(x, y);
  context.beginPath();
  if (signalId === 'circle') {
    context.arc(0, 0, size, 0, Math.PI * 2);
  } else if (signalId === 'triangle') {
    context.moveTo(0, -size * 1.08);
    context.lineTo(size * 0.95, size * 0.75);
    context.lineTo(-size * 0.95, size * 0.75);
    context.closePath();
  } else {
    context.rect(-size * 0.82, -size * 0.82, size * 1.64, size * 1.64);
  }
  context.lineWidth = Math.max(1.2, size * 0.16);
  context.strokeStyle = color;
  context.fillStyle = color;
  if (filled) context.fill();
  else context.stroke();
  context.restore();
}

function drawBackground() {
  context.fillStyle = '#050914';
  context.fillRect(0, 0, world.width, world.height);
  const glow = context.createRadialGradient(state.player.x, state.player.y, 0, state.player.x, state.player.y, Math.max(world.width, world.height) * 0.72);
  glow.addColorStop(0, 'rgba(32, 71, 107, .22)');
  glow.addColorStop(0.45, 'rgba(14, 30, 54, .12)');
  glow.addColorStop(1, 'rgba(5, 9, 20, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, world.width, world.height);

  context.save();
  context.globalAlpha = 0.36;
  context.strokeStyle = 'rgba(132, 179, 218, .12)';
  context.lineWidth = 1;
  const step = clamp(Math.min(world.width, world.height) / 10, 46, 68);
  const offsetX = (state.elapsed * 7) % step;
  const offsetY = (state.elapsed * 4) % step;
  context.beginPath();
  for (let x = -step + offsetX; x < world.width + step; x += step) {
    context.moveTo(x, 0);
    context.lineTo(x, world.height);
  }
  for (let y = -step + offsetY; y < world.height + step; y += step) {
    context.moveTo(0, y);
    context.lineTo(world.width, y);
  }
  context.stroke();
  context.restore();

  for (const star of world.stars) {
    const pulse = 0.75 + Math.sin(state.elapsed * star.depth + star.x) * 0.25;
    context.globalAlpha = star.alpha * pulse;
    context.fillStyle = '#dff6ff';
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawRouteGuide() {
  if (!state.carrying) return;
  const gate = state.gates.find((candidate) => candidate.signal.id === state.carrying.signal.id);
  if (!gate) return;
  context.save();
  context.setLineDash([4, 12]);
  context.lineDashOffset = -state.elapsed * 30;
  context.lineWidth = 1;
  const gradient = context.createLinearGradient(state.player.x, state.player.y, gate.x, gate.y);
  gradient.addColorStop(0, state.carrying.signal.color);
  gradient.addColorStop(1, 'rgba(255,255,255,.05)');
  context.strokeStyle = gradient;
  context.globalAlpha = 0.42;
  context.beginPath();
  context.moveTo(state.player.x, state.player.y);
  context.lineTo(gate.x, gate.y);
  context.stroke();
  context.restore();
}

function drawGate(gate) {
  const breathe = 1 + Math.sin(state.elapsed * 2.2 + gate.x * 0.01) * 0.035 + gate.pulse * 0.18;
  const radius = gate.radius * breathe;
  context.save();
  context.translate(gate.x, gate.y);
  context.rotate(gate.angle);
  context.shadowColor = gate.signal.color;
  context.shadowBlur = 16 + gate.pulse * 32;
  context.strokeStyle = gate.signal.color;
  context.lineWidth = 2 + gate.pulse * 2;
  context.globalAlpha = 0.72 + gate.pulse * 0.28;
  context.beginPath();
  context.arc(0, 0, radius, -Math.PI * 0.68, Math.PI * 0.68);
  context.stroke();
  context.shadowBlur = 0;
  context.globalAlpha = 0.22;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, radius + 9 + gate.pulse * 16, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  drawSignalShape(gate.signal.id, gate.x, gate.y, gate.radius * 0.28, gate.signal.color, false);
}

function drawPacket(packet) {
  const entering = clamp(packet.born / 0.35, 0, 1);
  const pulse = 1 + Math.sin(packet.phase * 2.2) * 0.08;
  const radius = packet.radius * pulse * entering;
  context.save();
  context.translate(packet.x, packet.y);
  context.globalCompositeOperation = 'lighter';
  context.shadowColor = packet.signal.color;
  context.shadowBlur = 20;
  context.fillStyle = packet.signal.color;
  context.globalAlpha = 0.13;
  context.beginPath();
  context.arc(0, 0, radius * 2.3, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.95;
  context.fillStyle = '#07101d';
  context.strokeStyle = packet.signal.color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius + 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.restore();
  drawSignalShape(packet.signal.id, packet.x, packet.y, radius * 0.52, packet.signal.color, true);

  context.save();
  context.strokeStyle = packet.signal.color;
  context.globalAlpha = 0.35;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(packet.x, packet.y, radius + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(packet.lifetime / packet.maxLifetime, 0, 1));
  context.stroke();
  context.restore();
}

function drawInterference(item) {
  context.save();
  context.translate(item.x, item.y);
  context.rotate(item.phase);
  context.globalCompositeOperation = 'lighter';
  context.shadowColor = '#ff5d7d';
  context.shadowBlur = 18;
  context.fillStyle = 'rgba(255, 62, 101, .15)';
  context.strokeStyle = 'rgba(255, 93, 125, .82)';
  context.lineWidth = 1.3;
  context.beginPath();
  const points = 10;
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const radius = item.radius * (index % 2 ? 0.65 : 1.2);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#050914';
  context.beginPath();
  context.arc(0, 0, item.radius * 0.34, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.42;
  context.setLineDash([2, 5]);
  context.beginPath();
  context.arc(0, 0, item.radius * 1.55, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawParticles() {
  context.save();
  context.globalCompositeOperation = 'lighter';
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPlayer() {
  const player = state.player;
  for (const trail of player.trail) {
    const alpha = clamp(trail.life / trail.maxLife, 0, 1);
    context.globalAlpha = alpha * (player.dashTimer > 0 ? 0.4 : 0.15);
    context.fillStyle = player.dashTimer > 0 ? '#5de4ff' : '#9fd7ea';
    context.beginPath();
    context.arc(trail.x, trail.y, player.radius * alpha * 0.8, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  const angle = Math.atan2(player.facingY, player.facingX);
  const flicker = player.hitLock > 0 && Math.floor(player.hitLock * 12) % 2 === 0;
  if (flicker) context.globalAlpha = 0.35;
  context.save();
  context.translate(player.x, player.y);
  context.rotate(angle + Math.PI / 4);
  context.globalCompositeOperation = 'lighter';
  context.shadowColor = player.dashTimer > 0 ? '#5de4ff' : '#dff9ff';
  context.shadowBlur = player.dashTimer > 0 ? 32 : 18;
  const scale = player.dashTimer > 0 ? 1.3 : 1;
  context.scale(scale, scale * (player.dashTimer > 0 ? 0.72 : 1));
  context.fillStyle = '#eafcff';
  context.strokeStyle = '#5de4ff';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(player.radius * 1.1, 0);
  context.lineTo(0, player.radius * 0.75);
  context.lineTo(-player.radius * 0.82, 0);
  context.lineTo(0, -player.radius * 0.75);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = '#07101d';
  context.beginPath();
  context.arc(player.radius * 0.2, 0, player.radius * 0.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.globalAlpha = 1;

  if (state.carrying) {
    const orbitX = player.x - player.facingY * 22;
    const orbitY = player.y + player.facingX * 22;
    context.save();
    context.strokeStyle = state.carrying.signal.color;
    context.globalAlpha = 0.45;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(player.x, player.y);
    context.lineTo(orbitX, orbitY);
    context.stroke();
    context.restore();
    drawSignalShape(state.carrying.signal.id, orbitX, orbitY, 6.5, state.carrying.signal.color, true);
  }
}

function drawFloatingText() {
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '800 12px Inter, system-ui, sans-serif';
  for (const text of state.floatingTexts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    context.globalAlpha = alpha;
    context.fillStyle = text.color;
    context.shadowColor = text.color;
    context.shadowBlur = 10;
    context.fillText(text.text, text.x, text.y);
  }
  context.restore();
}

function drawVignette() {
  if (state.time < 10 && state.phase === 'playing') {
    const pulse = 0.08 + (1 - state.time / 10) * 0.12 + Math.sin(state.elapsed * 5) * 0.025;
    const gradient = context.createRadialGradient(world.width / 2, world.height / 2, Math.min(world.width, world.height) * 0.2, world.width / 2, world.height / 2, Math.max(world.width, world.height) * 0.72);
    gradient.addColorStop(0, 'rgba(255, 40, 78, 0)');
    gradient.addColorStop(1, `rgba(255, 40, 78, ${pulse})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, world.width, world.height);
  }
  if (state.flash > 0) {
    context.fillStyle = `rgba(255, 70, 100, ${state.flash * 0.45})`;
    context.fillRect(0, 0, world.width, world.height);
  }
}

function draw() {
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  context.clearRect(0, 0, world.width, world.height);
  context.save();
  if (state.shake > 0 && !reducedMotion) {
    context.translate((state.random() - 0.5) * state.shake, (state.random() - 0.5) * state.shake);
  }
  drawBackground();
  drawRouteGuide();
  for (const gate of state.gates) drawGate(gate);
  for (const packet of state.packets) drawPacket(packet);
  for (const item of state.interference) drawInterference(item);
  drawParticles();
  drawPlayer();
  drawFloatingText();
  drawVignette();
  context.restore();
}

function frame(now) {
  const delta = Math.min(0.034, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (state.phase === 'playing') update(delta);
  else updateEffects(delta);
  draw();
  requestAnimationFrame(frame);
}

function pointerPosition(event) {
  const rect = elements.canvas.getBoundingClientRect();
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

elements.canvas.addEventListener('pointerdown', (event) => {
  if (state.phase !== 'playing') return;
  sound.unlock();
  input.pointerActive = true;
  input.pointerId = event.pointerId;
  input.target = pointerPosition(event);
  elements.canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

elements.canvas.addEventListener('pointermove', (event) => {
  if (!input.pointerActive || event.pointerId !== input.pointerId) return;
  input.target = pointerPosition(event);
  event.preventDefault();
});

function releasePointer(event) {
  if (event.pointerId !== input.pointerId) return;
  input.pointerActive = false;
  input.pointerId = null;
}

elements.canvas.addEventListener('pointerup', releasePointer);
elements.canvas.addEventListener('pointercancel', releasePointer);
elements.canvas.addEventListener('dblclick', (event) => {
  if (state.phase === 'playing') requestDash();
  event.preventDefault();
});

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (elements.instructionsDialog.open) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'spacebar'].includes(key)) event.preventDefault();
  if (key === 'p' || key === 'escape') {
    if (!event.repeat) togglePause();
    return;
  }
  if (key === 'm' && !event.repeat) {
    sound.setEnabled(!sound.enabled);
    setSoundButton();
    return;
  }
  if ((key === ' ' || key === 'spacebar') && !event.repeat) {
    if (state.phase === 'playing') requestDash();
    else if (state.phase === 'intro' || state.phase === 'gameover') startRun();
    else if (state.phase === 'paused') resumeGame();
    return;
  }
  input.keys.add(key);
});

document.addEventListener('keyup', (event) => input.keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  input.keys.clear();
  input.pointerActive = false;
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') pauseGame();
});

elements.primaryButton.addEventListener('click', () => {
  if (state.phase === 'paused') resumeGame();
  else startRun();
});
elements.pauseButton.addEventListener('click', togglePause);
elements.dashButton.addEventListener('pointerdown', (event) => {
  requestDash();
  event.preventDefault();
});
elements.soundButton.addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  setSoundButton();
});
elements.instructionsButton.addEventListener('click', () => {
  if (state.phase === 'playing') pauseGame();
  elements.instructionsDialog.showModal();
});
elements.fullscreenButton.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await elements.frame.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    elements.liveStatus.textContent = 'Fullscreen is unavailable in this browser.';
  }
});
document.addEventListener('fullscreenchange', () => {
  elements.fullscreenButton.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
  requestAnimationFrame(resizeCanvas);
});

const resizeObserver = new ResizeObserver(() => resizeCanvas());
resizeObserver.observe(elements.frame);
window.addEventListener('resize', resizeCanvas, { passive: true });

setSoundButton();
resizeCanvas();
layoutGates();
updateHud();
requestAnimationFrame(frame);
