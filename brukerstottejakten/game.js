import {
  TARGET_SCORE,
  clamp,
  createGameState,
  elapsedSeconds,
  progressPercent,
  recordEscape,
  recordShot,
  startGame,
} from './game-core.js';

const board = document.querySelector('#gameBoard');
const canvas = document.querySelector('#gameCanvas');
const context = canvas.getContext('2d', { alpha: false });

if (!board || !canvas || !context) {
  throw new Error('Spillområdet kunne ikke initialiseres.');
}

const ui = {
  startOverlay: document.querySelector('#startOverlay'),
  winOverlay: document.querySelector('#winOverlay'),
  startButton: document.querySelector('#startButton'),
  restartButton: document.querySelector('#restartButton'),
  soundButton: document.querySelector('#soundButton'),
  dutyStatus: document.querySelector('#dutyStatus'),
  statusChip: document.querySelector('.status-chip'),
  scoreText: document.querySelector('#scoreText'),
  shotsText: document.querySelector('#shotsText'),
  missesText: document.querySelector('#missesText'),
  scorePercent: document.querySelector('#scorePercent'),
  scoreFill: document.querySelector('#scoreFill'),
  scoreTrack: document.querySelector('#scoreTrack'),
  casesRemaining: document.querySelector('#casesRemaining'),
  remainingWord: document.querySelector('#remainingWord'),
  message: document.querySelector('#message'),
  crosshair: document.querySelector('#crosshair'),
  weaponHud: document.querySelector('#weaponHud'),
  winSummary: document.querySelector('#winSummary'),
};

const positiveMessages = [
  'Sak løst!',
  'Godkjent og lukket!',
  'Førstelinjen jubler!',
  'Ingen restanse her!',
  'Riktig kø, riktig tiltak!',
  'Saksflyt i verdensklasse!',
];

const palette = ['#ffd34d', '#d7652f', '#65c66d', '#fff2c9', '#70cbd4', '#e885b5'];

let state = createGameState();
let targets = [];
let particles = [];
let confetti = [];
let nextTargetId = 1;
let spawnClock = 0;
let lastFrame = performance.now();
let messageTimer = 0;
let winTimer = 0;
let soundEnabled = true;
let audioContext = null;

const world = { width: 1, height: 1, dpr: 1 };
const aim = {
  x: 0,
  y: 0,
  visible: false,
  pointerType: 'keyboard',
  hideAt: 0,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  world.width = Math.max(1, rect.width);
  world.height = Math.max(1, rect.height);
  world.dpr = dpr;

  canvas.width = Math.round(world.width * dpr);
  canvas.height = Math.round(world.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;

  if (!aim.x && !aim.y) {
    aim.x = world.width / 2;
    aim.y = world.height / 2;
  } else {
    aim.x = clamp(aim.x, 0, world.width);
    aim.y = clamp(aim.y, 0, world.height);
  }
  positionCrosshair();
}

function updateHud() {
  const percent = Math.round(progressPercent(state.score));
  const remaining = TARGET_SCORE - state.score;
  const online = state.status === 'running';

  ui.scoreText.textContent = `${state.score}/${TARGET_SCORE}`;
  ui.shotsText.textContent = String(state.shots);
  ui.missesText.textContent = String(state.misses);
  ui.scorePercent.textContent = `${percent} %`;
  ui.scoreFill.style.width = `${percent}%`;
  ui.scoreTrack.setAttribute('aria-valuenow', String(state.score));
  ui.casesRemaining.textContent = String(remaining);
  ui.remainingWord.textContent = remaining === 1 ? 'sak' : 'saker';
  ui.dutyStatus.textContent = online ? 'pålogget' : state.status === 'won' ? 'fullført' : 'frakoblet';
  ui.statusChip.classList.toggle('is-online', online);
}

function showMessage(text, bad = false, duration = 720) {
  window.clearTimeout(messageTimer);
  ui.message.textContent = text;
  ui.message.classList.toggle('is-bad', bad);
  ui.message.classList.add('is-visible');
  messageTimer = window.setTimeout(() => ui.message.classList.remove('is-visible'), duration);
}

function hideOverlay(overlay) {
  if (!overlay || overlay.hidden) return;
  overlay.classList.remove('is-visible');
  window.setTimeout(() => {
    if (!overlay.classList.contains('is-visible')) overlay.hidden = true;
  }, 180);
}

function showOverlay(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function startRound() {
  window.clearTimeout(winTimer);
  state = startGame(state);
  targets = [];
  particles = [];
  confetti = [];
  nextTargetId = 1;
  spawnClock = 0.15;
  aim.x = world.width / 2;
  aim.y = Math.max(100, world.height * 0.42);
  aim.visible = true;
  aim.pointerType = 'keyboard';
  aim.hideAt = 0;
  positionCrosshair();

  hideOverlay(ui.startOverlay);
  hideOverlay(ui.winOverlay);
  updateHud();
  showMessage('Vakten er i gang');
  ensureAudio();
  playStartSound();
  canvas.focus({ preventScroll: true });
}

function finishRound() {
  if (state.status !== 'won') return;
  const elapsed = elapsedSeconds(state).toFixed(1).replace('.', ',');
  const shotWord = state.shots === 1 ? 'skudd' : 'skudd';
  ui.winSummary.textContent = `Du løste 10 saker med ${state.shots} ${shotWord} på ${elapsed} sekunder. Service Manager har aldri sett maken.`;
  spawnConfetti();
  playWinSound();
  showOverlay(ui.winOverlay);
  ui.restartButton.focus({ preventScroll: true });
}

function spawnTarget() {
  const direction = Math.random() < 0.5 ? 1 : -1;
  const width = clamp(world.width * randomBetween(0.105, 0.145), 112, 162);
  const height = clamp(width * 0.47, 52, 72);
  const topLimit = Math.max(72, world.height * 0.13);
  const bottomLimit = Math.max(topLimit + 40, world.height - Math.max(180, world.height * 0.27));
  let baseY = randomBetween(topLimit, bottomLimit);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const crowded = targets.some((target) => !target.hit && Math.abs(target.y - baseY) < height * 1.5);
    if (!crowded) break;
    baseY = randomBetween(topLimit, bottomLimit);
  }

  const speed = randomBetween(112, 152) + state.score * 5.5;
  targets.push({
    id: nextTargetId,
    direction,
    x: direction === 1 ? -width - 18 : world.width + 18,
    y: baseY,
    baseY,
    width,
    height,
    speed,
    amplitude: randomBetween(16, Math.min(48, world.height * 0.08)),
    waveSpeed: randomBetween(1.65, 2.8),
    phase: randomBetween(0, Math.PI * 2),
    age: 0,
    rotation: 0,
    hit: false,
    hitAge: 0,
    alpha: 1,
  });
  nextTargetId += 1;
}

function updateTargets(delta) {
  const escaped = [];

  for (const target of targets) {
    if (target.hit) {
      target.hitAge += delta;
      target.y += (120 + target.hitAge * 680) * delta;
      target.rotation += target.direction * delta * 6.8;
      target.alpha = clamp(1 - target.hitAge / 0.7, 0, 1);
      continue;
    }

    target.age += delta;
    target.x += target.speed * target.direction * delta;
    target.y = target.baseY + Math.sin(target.age * target.waveSpeed + target.phase) * target.amplitude;
    target.rotation = Math.sin(target.age * target.waveSpeed * 0.7 + target.phase) * 0.055;

    const margin = target.width + 36;
    if ((target.direction === 1 && target.x > world.width + margin) || (target.direction === -1 && target.x < -margin)) {
      escaped.push(target.id);
    }
  }

  if (state.status === 'running' && escaped.length) {
    for (const _id of escaped) state = recordEscape(state);
    updateHud();
    showMessage(escaped.length > 1 ? 'Flere saker ble eskalert' : 'Saken ble eskalert', true, 760);
    playEscapeSound();
  }

  targets = targets.filter((target) => !escaped.includes(target.id) && target.hitAge < 0.72);
}

function updateParticles(delta) {
  for (const particle of particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 480 * delta;
    particle.rotation += particle.spin * delta;
  }
  particles = particles.filter((particle) => particle.life > 0);
}

function updateConfetti(delta) {
  for (const piece of confetti) {
    piece.x += piece.vx * delta;
    piece.y += piece.vy * delta;
    piece.vy += 125 * delta;
    piece.rotation += piece.spin * delta;
    if (piece.y > world.height + 24) {
      piece.y = randomBetween(-100, -16);
      piece.x = randomBetween(0, world.width);
      piece.vy = randomBetween(85, 170);
    }
  }
}

function createHitParticles(target) {
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  for (let index = 0; index < 14; index += 1) {
    const angle = randomBetween(-Math.PI, 0);
    const speed = randomBetween(70, 230);
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: randomBetween(5, 11),
      life: randomBetween(0.42, 0.72),
      rotation: randomBetween(0, Math.PI),
      spin: randomBetween(-8, 8),
      color: Math.random() < 0.72 ? '#d7652f' : '#fff2c9',
    });
  }
}

function spawnConfetti() {
  confetti = Array.from({ length: 110 }, () => ({
    x: randomBetween(0, world.width),
    y: randomBetween(-world.height, -12),
    vx: randomBetween(-28, 28),
    vy: randomBetween(85, 185),
    width: randomBetween(5, 11),
    height: randomBetween(8, 18),
    rotation: randomBetween(0, Math.PI),
    spin: randomBetween(-5, 5),
    color: palette[Math.floor(Math.random() * palette.length)],
  }));
}

function findTargetAt(x, y) {
  for (let index = targets.length - 1; index >= 0; index -= 1) {
    const target = targets[index];
    if (target.hit) continue;
    const padding = 9;
    if (
      x >= target.x - padding &&
      x <= target.x + target.width + padding &&
      y >= target.y - padding &&
      y <= target.y + target.height + padding
    ) {
      return target;
    }
  }
  return null;
}

function shoot(x, y) {
  if (state.status !== 'running') return;
  const target = findTargetAt(x, y);
  state = recordShot(state, Boolean(target));
  triggerRecoil();
  playShotSound();

  if (target) {
    target.hit = true;
    target.hitAge = 0;
    createHitParticles(target);
    playHitSound(state.score);
    showMessage(state.score === TARGET_SCORE ? 'Alle saker løst!' : positiveMessages[Math.floor(Math.random() * positiveMessages.length)]);
  } else {
    playMissSound();
    showMessage('Bom — saken flyr videre', true, 500);
  }

  updateHud();

  if (state.status === 'won') {
    winTimer = window.setTimeout(finishRound, 560);
  }
}

function triggerRecoil() {
  ui.weaponHud.classList.remove('is-firing');
  ui.crosshair.classList.remove('is-firing');
  void ui.weaponHud.offsetWidth;
  ui.weaponHud.classList.add('is-firing');
  ui.crosshair.classList.add('is-firing');
  window.setTimeout(() => {
    ui.weaponHud.classList.remove('is-firing');
    ui.crosshair.classList.remove('is-firing');
  }, 190);
}

function setAim(x, y, pointerType = 'mouse') {
  aim.x = clamp(x, 0, world.width);
  aim.y = clamp(y, 0, world.height);
  aim.visible = true;
  aim.pointerType = pointerType;
  aim.hideAt = pointerType === 'touch' ? performance.now() + 420 : 0;
  positionCrosshair();
}

function positionCrosshair() {
  ui.crosshair.style.left = `${aim.x}px`;
  ui.crosshair.style.top = `${aim.y}px`;
  ui.crosshair.classList.toggle('is-visible', aim.visible && state.status === 'running');
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * world.width,
    y: ((event.clientY - rect.top) / rect.height) * world.height,
  };
}

function drawPixelCloud(x, y, scale = 1) {
  context.fillStyle = 'rgba(255, 254, 243, .8)';
  context.fillRect(Math.round(x), Math.round(y + 14 * scale), Math.round(92 * scale), Math.round(24 * scale));
  context.fillRect(Math.round(x + 18 * scale), Math.round(y), Math.round(40 * scale), Math.round(25 * scale));
  context.fillRect(Math.round(x + 51 * scale), Math.round(y + 7 * scale), Math.round(29 * scale), Math.round(22 * scale));
}

function drawBackground(time) {
  const { width, height } = world;
  const horizon = height * 0.72;
  const sky = context.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#70cbd4');
  sky.addColorStop(0.7, '#b9e4d5');
  sky.addColorStop(1, '#fff2c9');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const sunSize = clamp(width * 0.055, 38, 76);
  context.fillStyle = '#ffd34d';
  context.fillRect(width * 0.81, height * 0.12, sunSize, sunSize);
  context.fillStyle = 'rgba(255,255,255,.25)';
  context.fillRect(width * 0.81 + 8, height * 0.12 + 8, sunSize - 16, 7);

  const drift = (time * 0.009) % (width + 240);
  drawPixelCloud(drift - 190, height * 0.18, 1.05);
  drawPixelCloud(width - drift * 0.45, height * 0.32, 0.72);
  drawPixelCloud(width * 0.42 + Math.sin(time * 0.00008) * 55, height * 0.1, 0.58);

  context.fillStyle = '#547f72';
  context.beginPath();
  context.moveTo(0, horizon);
  context.lineTo(0, horizon - height * 0.12);
  context.lineTo(width * 0.12, horizon - height * 0.19);
  context.lineTo(width * 0.25, horizon - height * 0.1);
  context.lineTo(width * 0.39, horizon - height * 0.2);
  context.lineTo(width * 0.55, horizon - height * 0.09);
  context.lineTo(width * 0.71, horizon - height * 0.18);
  context.lineTo(width * 0.86, horizon - height * 0.08);
  context.lineTo(width, horizon - height * 0.15);
  context.lineTo(width, horizon);
  context.closePath();
  context.fill();

  context.fillStyle = '#315f55';
  const buildingWidth = clamp(width * 0.055, 42, 76);
  for (let index = 0; index < 9; index += 1) {
    const x = width * 0.03 + index * width * 0.115;
    const buildingHeight = height * (0.075 + (index % 3) * 0.024);
    const y = horizon - buildingHeight;
    context.fillRect(x, y, buildingWidth, buildingHeight);
    context.fillStyle = '#ffd88a';
    const windowSize = clamp(buildingWidth * 0.12, 4, 8);
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        context.fillRect(x + 8 + column * (windowSize + 7), y + 10 + row * (windowSize + 9), windowSize, windowSize);
      }
    }
    context.fillStyle = '#315f55';
  }

  context.fillStyle = '#163f3a';
  context.fillRect(0, horizon, width, height - horizon);
  context.fillStyle = '#24594d';
  context.fillRect(0, horizon, width, Math.max(12, height * 0.025));

  context.fillStyle = '#0d302d';
  for (let x = -20; x < width + 20; x += 26) {
    const reed = 18 + ((x * 17) % 31 + 31) % 31;
    context.fillRect(x, horizon - reed, 7, reed + 8);
    context.fillRect(x - 8, horizon - reed + 8, 20, 7);
  }
}

function drawTarget(target) {
  const { width, height } = target;
  context.save();
  context.globalAlpha = target.alpha;
  context.translate(target.x + width / 2, target.y + height / 2);
  context.rotate(target.rotation);

  const left = -width / 2;
  const top = -height / 2;
  const motionDirection = target.direction === 1 ? -1 : 1;

  context.fillStyle = 'rgba(16, 42, 51, .45)';
  for (let line = 0; line < 3; line += 1) {
    const lineWidth = 18 + line * 13;
    context.fillRect(left + motionDirection * (lineWidth + 10), top + 10 + line * 13, lineWidth, 5);
  }

  context.fillStyle = '#07171d';
  context.fillRect(left + 6, top + 7, width, height);
  context.fillStyle = '#d7652f';
  context.fillRect(left, top, width, height);
  context.strokeStyle = '#07171d';
  context.lineWidth = 4;
  context.strokeRect(left + 2, top + 2, width - 4, height - 4);

  context.strokeStyle = '#71331f';
  context.lineWidth = 2;
  const rowHeight = height / 3;
  context.beginPath();
  context.moveTo(left + 3, top + rowHeight);
  context.lineTo(left + width - 3, top + rowHeight);
  context.moveTo(left + 3, top + rowHeight * 2);
  context.lineTo(left + width - 3, top + rowHeight * 2);
  context.moveTo(left + width * 0.28, top + 3);
  context.lineTo(left + width * 0.28, top + rowHeight);
  context.moveTo(left + width * 0.7, top + rowHeight);
  context.lineTo(left + width * 0.7, top + rowHeight * 2);
  context.moveTo(left + width * 0.38, top + rowHeight * 2);
  context.lineTo(left + width * 0.38, top + height - 3);
  context.stroke();

  const labelHeight = clamp(height * 0.43, 24, 31);
  context.fillStyle = '#fff2c9';
  context.fillRect(left + 8, -labelHeight / 2, width - 16, labelHeight);
  context.strokeStyle = '#07171d';
  context.lineWidth = 3;
  context.strokeRect(left + 8, -labelHeight / 2, width - 16, labelHeight);
  context.fillStyle = '#07171d';
  context.font = `900 ${clamp(width * 0.077, 9, 12)}px ui-monospace, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Brukerstøttesak', 0, 1, width - 24);

  context.fillStyle = '#ffd34d';
  context.fillRect(left + width - 25, top - 9, 26, 25);
  context.strokeStyle = '#07171d';
  context.lineWidth = 3;
  context.strokeRect(left + width - 25, top - 9, 26, 25);
  context.fillStyle = '#07171d';
  context.font = '1000 15px ui-monospace, monospace';
  context.fillText('!', left + width - 12, top + 4);

  if (target.hit) {
    context.strokeStyle = '#fffef3';
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(-13, -13);
    context.lineTo(13, 13);
    context.moveTo(13, -13);
    context.lineTo(-13, 13);
    context.stroke();
  }

  context.restore();
}

function drawParticles() {
  for (const particle of particles) {
    context.save();
    context.globalAlpha = clamp(particle.life / 0.3, 0, 1);
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.7);
    context.restore();
  }
}

function drawConfetti() {
  for (const piece of confetti) {
    context.save();
    context.translate(piece.x, piece.y);
    context.rotate(piece.rotation);
    context.fillStyle = piece.color;
    context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
    context.restore();
  }
}

function render(time) {
  drawBackground(time);
  for (const target of targets) drawTarget(target);
  drawParticles();
  drawConfetti();
}

function frame(time) {
  const delta = Math.min((time - lastFrame) / 1000, 0.05);
  lastFrame = time;

  if (state.status === 'running') {
    spawnClock -= delta;
    const activeTargets = targets.filter((target) => !target.hit).length;
    const maxTargets = state.score >= 7 ? 3 : state.score >= 3 ? 2 : 1;
    if (spawnClock <= 0 && activeTargets < maxTargets) {
      spawnTarget();
      spawnClock = randomBetween(0.58, 1.02) - state.score * 0.012;
    }
  }

  updateTargets(delta);
  updateParticles(delta);
  updateConfetti(delta);

  if (aim.hideAt && time >= aim.hideAt) {
    aim.visible = false;
    aim.hideAt = 0;
    positionCrosshair();
  }

  render(time);
  requestAnimationFrame(frame);
}

function ensureAudio() {
  if (!soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function tone(frequency, endFrequency, duration, type = 'square', volume = 0.035, delay = 0) {
  const audio = ensureAudio();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playStartSound() {
  tone(220, 330, 0.11, 'square', 0.025, 0);
  tone(330, 440, 0.12, 'square', 0.025, 0.1);
}

function playShotSound() {
  tone(145, 45, 0.1, 'sawtooth', 0.045, 0);
}

function playHitSound(score) {
  tone(360 + score * 12, 540 + score * 10, 0.09, 'square', 0.03, 0.06);
  tone(560 + score * 10, 760 + score * 8, 0.1, 'square', 0.025, 0.14);
}

function playMissSound() {
  tone(130, 86, 0.13, 'triangle', 0.018, 0.08);
}

function playEscapeSound() {
  tone(190, 105, 0.18, 'triangle', 0.02, 0);
}

function playWinSound() {
  [262, 330, 392, 523, 659].forEach((frequency, index) => {
    tone(frequency, frequency * 1.02, 0.18, 'square', 0.026, index * 0.12);
  });
}

ui.startButton.addEventListener('click', startRound);
ui.restartButton.addEventListener('click', startRound);
ui.soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  ui.soundButton.textContent = `Lyd: ${soundEnabled ? 'på' : 'av'}`;
  ui.soundButton.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) {
    ensureAudio();
    tone(330, 440, 0.08, 'square', 0.025);
  } else if (audioContext?.state === 'running') {
    audioContext.suspend().catch(() => {});
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
});

canvas.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse') {
    aim.visible = false;
    positionCrosshair();
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (state.status !== 'running') return;
  event.preventDefault();
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
  shoot(point.x, point.y);
});

canvas.addEventListener('keydown', (event) => {
  if (state.status !== 'running') return;
  const step = event.shiftKey ? 46 : 24;
  let handled = true;

  switch (event.key) {
    case 'ArrowLeft':
      setAim(aim.x - step, aim.y, 'keyboard');
      break;
    case 'ArrowRight':
      setAim(aim.x + step, aim.y, 'keyboard');
      break;
    case 'ArrowUp':
      setAim(aim.x, aim.y - step, 'keyboard');
      break;
    case 'ArrowDown':
      setAim(aim.x, aim.y + step, 'keyboard');
      break;
    case ' ':
    case 'Enter':
      shoot(aim.x, aim.y);
      break;
    default:
      handled = false;
  }

  if (handled) event.preventDefault();
});

document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
});

const resizeObserver = new ResizeObserver(resizeCanvas);
resizeObserver.observe(board);
resizeCanvas();
updateHud();
positionCrosshair();
requestAnimationFrame(frame);
