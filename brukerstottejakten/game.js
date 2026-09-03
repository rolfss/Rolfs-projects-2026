import {
  QUIZ_MILESTONES,
  TARGET_CASES,
  accuracyPercent,
  clamp,
  createGameState,
  elapsedSeconds,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  recordShot,
  startGame,
  unlockedMissions,
} from './game-core.js';

const board = document.querySelector('#gameBoard');
const canvas = document.querySelector('#gameCanvas');
const context = canvas?.getContext('2d', { alpha: false });

if (!board || !canvas || !context) throw new Error('Spillområdet kunne ikke initialiseres.');

const ui = {
  startOverlay: document.querySelector('#startOverlay'),
  quizOverlay: document.querySelector('#quizOverlay'),
  pauseOverlay: document.querySelector('#pauseOverlay'),
  winOverlay: document.querySelector('#winOverlay'),
  startButton: document.querySelector('#startButton'),
  restartButton: document.querySelector('#restartButton'),
  resumeButton: document.querySelector('#resumeButton'),
  soundButton: document.querySelector('#soundButton'),
  pauseButton: document.querySelector('#pauseButton'),
  dutyStatus: document.querySelector('#dutyStatus'),
  statusChip: document.querySelector('#statusChip'),
  levelText: document.querySelector('#levelText'),
  levelName: document.querySelector('#levelName'),
  scoreText: document.querySelector('#scoreText'),
  pointsText: document.querySelector('#pointsText'),
  comboText: document.querySelector('#comboText'),
  comboItem: document.querySelector('.combo-item'),
  missesText: document.querySelector('#missesText'),
  missionCount: document.querySelector('#missionCount'),
  missionItems: [...document.querySelectorAll('[data-mission]')],
  powerup: document.querySelector('#powerup'),
  powerupTimer: document.querySelector('#powerupTimer'),
  message: document.querySelector('#message'),
  floatingScore: document.querySelector('#floatingScore'),
  crosshair: document.querySelector('#crosshair'),
  weaponHud: document.querySelector('#weaponHud'),
  scorePercent: document.querySelector('#scorePercent'),
  scoreFill: document.querySelector('#scoreFill'),
  scoreTrack: document.querySelector('#scoreTrack'),
  casesRemaining: document.querySelector('#casesRemaining'),
  remainingWord: document.querySelector('#remainingWord'),
  highScoreText: document.querySelector('#highScoreText'),
  quizTitle: document.querySelector('#quizTitle'),
  quizProgress: document.querySelector('#quizProgress'),
  quizOptions: document.querySelector('#quizOptions'),
  quizFeedback: document.querySelector('#quizFeedback'),
  winSummary: document.querySelector('#winSummary'),
  resultPoints: document.querySelector('#resultPoints'),
  resultAccuracy: document.querySelector('#resultAccuracy'),
  resultCombo: document.querySelector('#resultCombo'),
  resultQuiz: document.querySelector('#resultQuiz'),
  badgeRow: document.querySelector('#badgeRow'),
};

const levelNames = ['Førstelinje', 'Køfører', 'Problemløser', 'Driftslegende'];
const positiveMessages = [
  'Sak løst og lukket!',
  'Riktig kø. Riktig tiltak.',
  'Førstelinjen jubler!',
  'Ingen restanse her.',
  'Saksflyt i verdensklasse!',
  'Løst før neste statusmøte!',
  'Dokumentert. Verifisert. Lukket.',
];
const missionLabels = {
  warmup: 'Få kontroll',
  flow: 'Arbeidsflyt',
  noark: 'Noark-klar',
  control: 'Køkontroll',
};
const noarkQuestions = [
  {
    question: 'Hva er Noark 5?',
    options: ['En standard for elektronisk arkivdanning', 'Et tekstbehandlingsprogram'],
    correct: 0,
    fact: 'Riktig. Noark 5 stiller krav til arkivstruktur, metadata og funksjonalitet for elektronisk arkivdanning.',
  },
  {
    question: 'Skal metadata gjøre dokumentasjon enklere å finne og forstå?',
    options: ['Ja', 'Nei'],
    correct: 0,
    fact: 'Riktig. Metadata bevarer sammenheng og gjør dokumentasjon søkbar og forståelig over tid.',
  },
  {
    question: 'Kan et fagsystem integreres med en Noark 5-kjerne?',
    options: ['Ja', 'Nei'],
    correct: 0,
    fact: 'Riktig. En Noark 5-kjerne kan motta og forvalte arkivinformasjon fra ett eller flere fagsystemer.',
  },
  {
    question: 'Er en journalpost og et dokument alltid det samme?',
    options: ['Nei', 'Ja'],
    correct: 0,
    fact: 'Riktig. En journalpost er en registrering og kan knyttes til et hoveddokument og vedlegg.',
  },
  {
    question: 'Kan tilgang og skjerming styres med registrerte opplysninger?',
    options: ['Ja', 'Nei'],
    correct: 0,
    fact: 'Riktig. Tilgangskoder, autorisasjon og skjermingsmetadata kan styre hva ulike brukere får se.',
  },
  {
    question: 'Betyr bevaring og kassasjon det samme?',
    options: ['Nei', 'Ja'],
    correct: 0,
    fact: 'Riktig. Bevaring betyr at materialet skal tas vare på; kassasjon betyr at det kan destrueres etter regler.',
  },
];
const targetSchemes = {
  normal: { front: '#df7040', light: '#ff9b57', dark: '#7f3025', edge: '#ffe0a8', stripe: '#ffd65c' },
  priority: { front: '#bf4847', light: '#ff776c', dark: '#641f2b', edge: '#ffd5c8', stripe: '#fff0a6' },
  legacy: { front: '#378f86', light: '#63d1bd', dark: '#17504f', edge: '#ccfff1', stripe: '#ffe182' },
};
const confettiColors = ['#ffd85a', '#5be0c1', '#f67b50', '#f7f0d0', '#79aef5', '#f58abd'];
const testMode = new URLSearchParams(window.location.search).has('test');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let state = createGameState();
let targets = [];
let particles = [];
let shockwaves = [];
let confetti = [];
let targetId = 1;
let spawnClock = 0;
let lastFrame = performance.now();
let animationTime = 0;
let messageTimer = 0;
let winTimer = 0;
let quizTimer = 0;
let soundEnabled = true;
let audioContext = null;
let paused = false;
let quizActive = false;
let quizPending = false;
let quizIndex = 0;
let quizDeck = [];
let currentQuestion = null;
let slowUntil = 0;
let highScore = readHighScore();
let missionSnapshot = { warmup: false, flow: false, noark: false, control: false };

const world = { width: 1, height: 1, dpr: 1, horizon: 1 };
const aim = { x: 0, y: 0, visible: false, pointerType: 'keyboard', hideAt: 0 };

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function readHighScore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('brukerstottejakten-v2-score') || 'null');
    return saved && Number.isFinite(saved.points) ? saved : null;
  } catch {
    return null;
  }
}

function writeHighScore(result) {
  try {
    window.localStorage.setItem('brukerstottejakten-v2-score', JSON.stringify(result));
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  world.width = Math.max(1, rect.width);
  world.height = Math.max(1, rect.height);
  world.dpr = dpr;
  world.horizon = world.height * 0.68;
  canvas.width = Math.round(world.width * dpr);
  canvas.height = Math.round(world.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;

  if (!aim.x && !aim.y) {
    aim.x = world.width / 2;
    aim.y = world.height * 0.42;
  } else {
    aim.x = clamp(aim.x, 0, world.width);
    aim.y = clamp(aim.y, 0, world.height);
  }
  positionCrosshair();
}

function updateHud({ announceMissions = false } = {}) {
  const percent = Math.round(progressPercent(state.casesSolved));
  const remaining = TARGET_CASES - state.casesSolved;
  const online = state.status === 'running' && !paused && !quizActive;

  ui.levelText.textContent = String(state.level);
  ui.levelName.textContent = levelNames[state.level - 1];
  ui.scoreText.textContent = `${state.casesSolved}/${TARGET_CASES}`;
  ui.pointsText.textContent = String(state.points);
  ui.comboText.textContent = `x${state.streak}`;
  ui.missesText.textContent = String(state.escalations);
  ui.scorePercent.textContent = `${percent} %`;
  ui.scoreFill.style.width = `${percent}%`;
  ui.scoreTrack.setAttribute('aria-valuenow', String(state.casesSolved));
  ui.casesRemaining.textContent = String(remaining);
  ui.remainingWord.textContent = remaining === 1 ? 'sak' : 'saker';
  ui.highScoreText.textContent = highScore ? `Rekord: ${highScore.points} p` : 'Rekord: —';

  let duty = 'frakoblet';
  if (state.status === 'won') duty = 'fullført';
  else if (paused) duty = 'pause';
  else if (quizActive) duty = 'fagtest';
  else if (state.status === 'running') duty = 'pålogget';
  ui.dutyStatus.textContent = duty;
  ui.statusChip.classList.toggle('is-online', online);
  ui.statusChip.classList.toggle('is-paused', paused || quizActive);
  ui.pauseButton.disabled = state.status !== 'running' || quizActive;
  ui.pauseButton.textContent = paused ? 'Fortsett' : 'Pause';
  ui.pauseButton.setAttribute('aria-pressed', String(paused));

  const missions = unlockedMissions(state);
  const newlyUnlocked = [];
  for (const item of ui.missionItems) {
    const name = item.dataset.mission;
    item.classList.toggle('is-complete', Boolean(missions[name]));
    if (announceMissions && missions[name] && !missionSnapshot[name]) newlyUnlocked.push(name);
  }
  ui.missionCount.textContent = `${Object.values(missions).filter(Boolean).length}/4`;
  missionSnapshot = missions;

  if (newlyUnlocked.length) {
    window.setTimeout(() => {
      showMessage(`Delmål fullført: ${missionLabels[newlyUnlocked[0]]}`);
      playMissionSound();
    }, 160);
  }
}

function showMessage(text, bad = false, duration = 760) {
  window.clearTimeout(messageTimer);
  ui.message.textContent = text;
  ui.message.classList.toggle('is-bad', bad);
  ui.message.classList.add('is-visible');
  messageTimer = window.setTimeout(() => ui.message.classList.remove('is-visible'), duration);
}

function showFloatingScore(text, x = aim.x, y = aim.y) {
  ui.floatingScore.textContent = text;
  ui.floatingScore.style.left = `${clamp(x, 45, world.width - 45)}px`;
  ui.floatingScore.style.top = `${clamp(y, 80, world.height - 90)}px`;
  ui.floatingScore.classList.remove('pop');
  void ui.floatingScore.offsetWidth;
  ui.floatingScore.classList.add('pop');
}

function hideOverlay(overlay) {
  if (!overlay || overlay.hidden) return;
  overlay.classList.remove('is-visible');
  window.setTimeout(() => {
    if (!overlay.classList.contains('is-visible')) overlay.hidden = true;
  }, 190);
}

function showOverlay(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function startRound() {
  window.clearTimeout(winTimer);
  window.clearTimeout(quizTimer);
  state = startGame(state);
  targets = [];
  particles = [];
  shockwaves = [];
  confetti = [];
  targetId = 1;
  spawnClock = 0.18;
  paused = false;
  quizActive = false;
  quizPending = false;
  quizIndex = 0;
  quizDeck = shuffle(noarkQuestions).slice(0, QUIZ_MILESTONES.length);
  currentQuestion = null;
  slowUntil = 0;
  missionSnapshot = { warmup: false, flow: false, noark: false, control: false };
  aim.x = world.width / 2;
  aim.y = Math.max(90, world.height * 0.42);
  aim.visible = true;
  aim.pointerType = 'keyboard';
  aim.hideAt = 0;
  positionCrosshair();

  hideOverlay(ui.startOverlay);
  hideOverlay(ui.quizOverlay);
  hideOverlay(ui.pauseOverlay);
  hideOverlay(ui.winOverlay);
  ui.powerup.classList.remove('is-active');
  board.classList.remove('is-powerup', 'is-danger');
  updateHud();
  showMessage('Vakten er i gang');
  ensureAudio();
  playStartSound();
  canvas.focus({ preventScroll: true });
}

function finishRound() {
  if (state.status !== 'won') return;
  const seconds = elapsedSeconds(state);
  const elapsed = seconds.toFixed(1).replace('.', ',');
  const accuracy = Math.round(accuracyPercent(state));
  const result = { points: state.points, seconds, accuracy, date: Date.now() };

  if (!highScore || result.points > highScore.points || (result.points === highScore.points && result.seconds < highScore.seconds)) {
    highScore = result;
    writeHighScore(result);
  }

  ui.winSummary.textContent = `Du løste 10 saker med ${state.shots} skudd på ${elapsed} sekunder. Service Manager har aldri sett maken.`;
  ui.resultPoints.textContent = String(state.points);
  ui.resultAccuracy.textContent = `${accuracy} %`;
  ui.resultCombo.textContent = `x${state.bestStreak}`;
  ui.resultQuiz.textContent = `${state.quizCorrect}/${state.quizAnswered}`;
  renderResultBadges();
  updateHud();
  spawnConfetti();
  playWinSound();
  showOverlay(ui.winOverlay);
  ui.restartButton.focus({ preventScroll: true });
}

function renderResultBadges() {
  const unlocked = unlockedMissions(state);
  ui.badgeRow.replaceChildren();
  for (const [name, complete] of Object.entries(unlocked)) {
    if (!complete) continue;
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.textContent = missionLabels[name];
    ui.badgeRow.append(badge);
  }
  if (!ui.badgeRow.children.length) {
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.textContent = 'Vakten fullført';
    ui.badgeRow.append(badge);
  }
}

function togglePause(force) {
  if (state.status !== 'running' || quizActive) return;
  paused = typeof force === 'boolean' ? force : !paused;
  if (paused) {
    showOverlay(ui.pauseOverlay);
    ui.resumeButton.focus({ preventScroll: true });
  } else {
    hideOverlay(ui.pauseOverlay);
    canvas.focus({ preventScroll: true });
  }
  positionCrosshair();
  updateHud();
}

function targetLimits() {
  const top = Math.max(82, world.height * 0.14);
  const bottom = Math.max(top + 55, world.horizon - Math.max(50, world.height * 0.07));
  return { top, bottom };
}

function spawnTarget(overrides = {}) {
  const { top, bottom } = targetLimits();
  const direction = overrides.direction ?? (Math.random() < 0.5 ? 1 : -1);
  const depth = overrides.depth ?? randomBetween(0.78, 1.24);
  const width = overrides.width ?? clamp(world.width * 0.092 * depth, 105, 178);
  const height = overrides.height ?? clamp(width * 0.42, 47, 74);
  let baseY = overrides.baseY ?? randomBetween(top, bottom);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const crowded = targets.some((target) => !target.hit && Math.abs(target.y - baseY) < height * 1.35);
    if (!crowded) break;
    baseY = randomBetween(top, bottom);
  }

  const priorityChance = state.level >= 3 ? 0.27 : state.level >= 2 ? 0.12 : 0;
  const legacyChance = state.level >= 2 ? 0.13 : 0.05;
  const roll = Math.random();
  const kind = overrides.kind ?? (roll < priorityChance ? 'priority' : roll < priorityChance + legacyChance ? 'legacy' : 'normal');
  const speedModifier = kind === 'priority' ? 1.24 : kind === 'legacy' ? 0.88 : 1;
  const speed = overrides.speed ?? (randomBetween(105, 145) + state.level * 15 + state.casesSolved * 2.2) * speedModifier * depth;

  targets.push({
    id: targetId,
    ticket: 4200 + targetId,
    direction,
    x: overrides.x ?? (direction === 1 ? -width - 34 : world.width + 34),
    y: baseY,
    baseY,
    width,
    height,
    speed,
    depth,
    kind,
    amplitude: randomBetween(10, Math.min(40, world.height * 0.06)) * (1.3 - depth * .18),
    waveSpeed: randomBetween(1.45, 2.7),
    phase: randomBetween(0, Math.PI * 2),
    age: 0,
    rotation: 0,
    tilt: randomBetween(-0.09, 0.09),
    hit: false,
    hitAge: 0,
    alpha: 1,
  });
  targetId += 1;
  return targets.at(-1);
}

function updateTargets(delta) {
  const escaped = [];

  for (const target of targets) {
    if (target.hit) {
      target.hitAge += delta;
      target.y += (90 + target.hitAge * 760) * delta;
      target.x += target.direction * 36 * delta;
      target.rotation += target.direction * delta * 7.4;
      target.alpha = clamp(1 - target.hitAge / 0.82, 0, 1);
      continue;
    }

    target.age += delta;
    target.x += target.speed * target.direction * delta;
    target.y = target.baseY + Math.sin(target.age * target.waveSpeed + target.phase) * target.amplitude;
    target.rotation = Math.sin(target.age * target.waveSpeed * .72 + target.phase) * .07 + target.tilt;

    const margin = target.width + 48;
    if ((target.direction === 1 && target.x > world.width + margin) || (target.direction === -1 && target.x < -margin)) escaped.push(target.id);
  }

  if (state.status === 'running' && escaped.length) {
    for (const _id of escaped) state = recordEscape(state);
    updateHud({ announceMissions: false });
    showMessage(escaped.length > 1 ? 'Flere saker ble eskalert' : 'Saken ble eskalert', true, 780);
    playEscapeSound();
  }

  targets = targets.filter((target) => !escaped.includes(target.id) && target.hitAge < .84);
}

function updateParticles(delta) {
  for (const particle of particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += particle.gravity * delta;
    particle.rotation += particle.spin * delta;
  }
  particles = particles.filter((particle) => particle.life > 0);

  for (const wave of shockwaves) {
    wave.life -= delta;
    wave.radius += wave.speed * delta;
  }
  shockwaves = shockwaves.filter((wave) => wave.life > 0);
}

function updateConfetti(delta) {
  for (const piece of confetti) {
    piece.x += piece.vx * delta;
    piece.y += piece.vy * delta;
    piece.vy += 115 * delta;
    piece.rotation += piece.spin * delta;
    if (piece.y > world.height + 24) {
      piece.y = randomBetween(-110, -20);
      piece.x = randomBetween(0, world.width);
      piece.vy = randomBetween(75, 150);
    }
  }
}

function createHitParticles(target) {
  const centerX = target.x + target.width / 2;
  const centerY = target.y + target.height / 2;
  const scheme = targetSchemes[target.kind];
  const count = reducedMotion ? 8 : 19;
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(-Math.PI * .95, Math.PI * .15);
    const speed = randomBetween(75, 260);
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: randomBetween(380, 560),
      width: randomBetween(5, 14) * target.depth,
      height: randomBetween(4, 11) * target.depth,
      life: randomBetween(.46, .82),
      maxLife: .82,
      rotation: randomBetween(0, Math.PI),
      spin: randomBetween(-10, 10),
      color: Math.random() < .72 ? scheme.front : scheme.edge,
    });
  }
  shockwaves.push({ x: centerX, y: centerY, radius: 8, speed: 180, life: .38, maxLife: .38, color: scheme.edge });
}

function spawnConfetti() {
  const count = reducedMotion ? 35 : 125;
  confetti = Array.from({ length: count }, () => ({
    x: randomBetween(0, world.width),
    y: randomBetween(-world.height, -12),
    vx: randomBetween(-30, 30),
    vy: randomBetween(75, 175),
    width: randomBetween(5, 12),
    height: randomBetween(8, 19),
    rotation: randomBetween(0, Math.PI),
    spin: randomBetween(-5, 5),
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));
}

function findTargetAt(x, y) {
  const ordered = [...targets].sort((a, b) => b.depth - a.depth);
  for (const target of ordered) {
    if (target.hit) continue;
    const padding = Math.max(12, target.height * .2);
    if (
      x >= target.x - padding &&
      x <= target.x + target.width + padding &&
      y >= target.y - padding &&
      y <= target.y + target.height + padding
    ) return target;
  }
  return null;
}

function shoot(x, y) {
  if (state.status !== 'running' || paused || quizActive || quizPending) return false;
  const target = findTargetAt(x, y);
  resolveShot(target, x, y);
  return Boolean(target);
}

function resolveShot(target, x, y) {
  const previousLevel = state.level;
  state = recordShot(state, Boolean(target));
  triggerRecoil();
  playShotSound();

  if (target) {
    target.hit = true;
    target.hitAge = 0;
    createHitParticles(target);
    playHitSound(state.streak);
    showFloatingScore('+1', x, y);
    showMessage(state.casesSolved === TARGET_CASES ? 'Alle saker løst!' : positiveMessages[Math.floor(Math.random() * positiveMessages.length)]);

    if (state.streak > 0 && state.streak % 3 === 0) {
      ui.comboItem.classList.remove('is-hot');
      void ui.comboItem.offsetWidth;
      ui.comboItem.classList.add('is-hot');
      showFloatingScore(`KOMBO x${state.streak}`, x, y - 24);
      playComboSound(state.streak);
    }
  } else {
    playMissSound();
    showMessage('Bom — saken flyr videre', true, 520);
  }

  updateHud({ announceMissions: true });

  if (state.level > previousLevel) {
    window.setTimeout(() => {
      showMessage(`Nivå ${state.level}: ${levelNames[state.level - 1]}`);
      playLevelSound();
    }, 260);
  }

  if (state.status === 'won') {
    quizPending = true;
    targets.forEach((candidate) => { candidate.hit = true; });
    winTimer = window.setTimeout(finishRound, testMode ? 40 : 680);
    return;
  }

  maybeScheduleQuiz();
}

function maybeScheduleQuiz() {
  const milestone = QUIZ_MILESTONES[quizIndex];
  if (!milestone || state.casesSolved < milestone || quizActive || quizPending) return;
  quizPending = true;
  quizTimer = window.setTimeout(openQuiz, testMode ? 20 : 520);
}

function openQuiz() {
  if (state.status !== 'running') return;
  quizActive = true;
  quizPending = false;
  currentQuestion = quizDeck[quizIndex] || noarkQuestions[quizIndex % noarkQuestions.length];
  ui.quizTitle.textContent = currentQuestion.question;
  ui.quizProgress.textContent = `${quizIndex + 1}/${QUIZ_MILESTONES.length}`;
  ui.quizFeedback.textContent = '';
  ui.quizFeedback.className = 'quiz-feedback';
  ui.quizOptions.replaceChildren();

  currentQuestion.options.forEach((option, optionIndex) => {
    const button = document.createElement('button');
    button.className = 'quiz-option';
    button.type = 'button';
    button.textContent = option;
    button.dataset.optionIndex = String(optionIndex);
    button.addEventListener('click', () => answerQuiz(optionIndex));
    ui.quizOptions.append(button);
  });

  updateHud();
  showOverlay(ui.quizOverlay);
  window.setTimeout(() => ui.quizOptions.querySelector('button')?.focus({ preventScroll: true }), 30);
  playQuizOpenSound();
}

function answerQuiz(optionIndex) {
  if (!quizActive || !currentQuestion) return false;
  const correct = optionIndex === currentQuestion.correct;
  const buttons = [...ui.quizOptions.querySelectorAll('button')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === currentQuestion.correct) button.classList.add('is-correct');
    if (!correct && index === optionIndex) button.classList.add('is-wrong');
  });

  state = recordQuizAnswer(state, correct);
  ui.quizFeedback.classList.add(correct ? 'is-correct' : 'is-wrong');
  ui.quizFeedback.textContent = correct ? `${currentQuestion.fact} +1 poeng og faglig flyt.` : `Ikke helt. ${(currentQuestion.fact.startsWith('Riktig. ') ? currentQuestion.fact.slice(8) : currentQuestion.fact)} −1 poeng.`;

  if (correct) {
    slowUntil = performance.now() + 6_000;
    board.classList.add('is-powerup');
    ui.powerup.classList.add('is-active');
    showFloatingScore('+1 NOARK', world.width / 2, world.height * .39);
    playQuizCorrectSound();
  } else {
    board.classList.remove('is-danger');
    void board.offsetWidth;
    board.classList.add('is-danger');
    showFloatingScore('−1', world.width / 2, world.height * .39);
    playQuizWrongSound();
  }

  updateHud({ announceMissions: true });
  quizIndex += 1;
  window.setTimeout(() => {
    quizActive = false;
    currentQuestion = null;
    hideOverlay(ui.quizOverlay);
    updateHud();
    canvas.focus({ preventScroll: true });
  }, testMode ? 40 : 1_240);
  return correct;
}

function triggerRecoil() {
  ui.weaponHud.classList.remove('is-firing');
  ui.crosshair.classList.remove('is-firing');
  board.classList.remove('is-shaking');
  void ui.weaponHud.offsetWidth;
  ui.weaponHud.classList.add('is-firing');
  ui.crosshair.classList.add('is-firing');
  if (!reducedMotion) board.classList.add('is-shaking');
  window.setTimeout(() => {
    ui.weaponHud.classList.remove('is-firing');
    ui.crosshair.classList.remove('is-firing');
    board.classList.remove('is-shaking');
  }, 200);
}

function setAim(x, y, pointerType = 'mouse') {
  aim.x = clamp(x, 0, world.width);
  aim.y = clamp(y, 0, world.height);
  aim.visible = true;
  aim.pointerType = pointerType;
  aim.hideAt = pointerType === 'touch' ? performance.now() + 430 : 0;
  positionCrosshair();
}

function positionCrosshair() {
  ui.crosshair.style.left = `${aim.x}px`;
  ui.crosshair.style.top = `${aim.y}px`;
  ui.crosshair.classList.toggle('is-visible', aim.visible && state.status === 'running' && !paused && !quizActive);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * world.width,
    y: ((event.clientY - rect.top) / rect.height) * world.height,
  };
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPixelCloud(x, y, scale, alpha = .7) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = '#f4fff2';
  context.shadowColor = 'rgba(255,255,255,.24)';
  context.shadowBlur = 14 * scale;
  roundedRectPath(context, x, y + 13 * scale, 94 * scale, 25 * scale, 8 * scale);
  context.fill();
  roundedRectPath(context, x + 18 * scale, y, 42 * scale, 30 * scale, 11 * scale);
  context.fill();
  roundedRectPath(context, x + 54 * scale, y + 7 * scale, 31 * scale, 25 * scale, 9 * scale);
  context.fill();
  context.restore();
}

function drawMountains(baseY, amplitude, color, offset, step) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, world.height);
  context.lineTo(0, baseY);
  for (let x = -step; x <= world.width + step; x += step) {
    const wave = Math.sin((x + offset) * .006) * amplitude * .23;
    context.lineTo(x, baseY - amplitude - wave);
    context.lineTo(x + step * .55, baseY + wave * .5);
  }
  context.lineTo(world.width, world.height);
  context.closePath();
  context.fill();
}

function drawBackground(time) {
  const { width, height, horizon } = world;
  const parallaxX = (aim.x / Math.max(width, 1) - .5);
  const parallaxY = (aim.y / Math.max(height, 1) - .5);

  const sky = context.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#236f84');
  sky.addColorStop(.48, '#65b9b5');
  sky.addColorStop(.79, '#b8d9b5');
  sky.addColorStop(1, '#f4d697');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const glowX = width * .78 - parallaxX * 18;
  const glowY = height * .16 - parallaxY * 9;
  const sunGradient = context.createRadialGradient(glowX, glowY, 3, glowX, glowY, clamp(width * .085, 54, 110));
  sunGradient.addColorStop(0, 'rgba(255,252,197,.98)');
  sunGradient.addColorStop(.32, 'rgba(255,216,90,.88)');
  sunGradient.addColorStop(1, 'rgba(255,205,84,0)');
  context.fillStyle = sunGradient;
  context.fillRect(glowX - 120, glowY - 120, 240, 240);
  context.fillStyle = '#ffe37b';
  context.beginPath();
  context.arc(glowX, glowY, clamp(width * .025, 23, 39), 0, Math.PI * 2);
  context.fill();

  const cloudDrift = (time * 9) % (width + 280);
  drawPixelCloud(width - cloudDrift - 120 - parallaxX * 26, height * .14, .76, .72);
  drawPixelCloud((cloudDrift * .62) - 180 - parallaxX * 15, height * .28, .52, .5);
  drawPixelCloud(width * .38 - ((time * 4.2) % (width + 260)) - parallaxX * 9, height * .08, .38, .37);

  drawMountains(horizon + 8, height * .15, '#4e8580', time * 9 + parallaxX * 38, width * .17);
  drawMountains(horizon + 18, height * .105, '#396b68', time * 14 + parallaxX * 60, width * .13);

  // Distant service-centre skyline.
  const skylineY = horizon - height * .07;
  context.fillStyle = '#245356';
  const buildingWidth = clamp(width * .045, 38, 72);
  for (let index = -1; index < Math.ceil(width / buildingWidth) + 1; index += 1) {
    const x = index * buildingWidth - ((time * 2.2) % buildingWidth) - parallaxX * 18;
    const buildingHeight = height * (.04 + ((index * 37) % 5) * .012);
    context.fillRect(x, skylineY - buildingHeight, buildingWidth - 8, buildingHeight);
    context.fillStyle = 'rgba(161,255,220,.22)';
    for (let row = 0; row < 3; row += 1) {
      context.fillRect(x + 7, skylineY - buildingHeight + 8 + row * 12, 5, 4);
      context.fillRect(x + 19, skylineY - buildingHeight + 8 + row * 12, 5, 4);
    }
    context.fillStyle = '#245356';
  }

  const ground = context.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, '#315f51');
  ground.addColorStop(.55, '#173e36');
  ground.addColorStop(1, '#0a2728');
  context.fillStyle = ground;
  context.fillRect(0, horizon, width, height - horizon);

  // Perspective grid gives the field depth without turning it into a neon parody.
  context.save();
  context.globalAlpha = .23;
  context.strokeStyle = '#8be2bc';
  context.lineWidth = 1;
  const vanishingX = width * .5 - parallaxX * 34;
  for (let index = -10; index <= 10; index += 1) {
    context.beginPath();
    context.moveTo(vanishingX + index * 7, horizon);
    context.lineTo(vanishingX + index * width * .13, height);
    context.stroke();
  }
  for (let step = 0; step < 11; step += 1) {
    const p = step / 10;
    const y = horizon + (height - horizon) * p * p;
    context.globalAlpha = .08 + p * .2;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  // Foreground foliage and terminal lights.
  context.fillStyle = '#0b2929';
  for (let x = -20; x < width + 40; x += 34) {
    const sway = Math.sin(time * 1.7 + x * .07) * 3;
    context.beginPath();
    context.arc(x + sway, height + 4, 31 + (x % 3) * 3, Math.PI, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = 'rgba(91,224,193,.25)';
  for (let x = 20; x < width; x += 78) context.fillRect(x, height - 12, 3, 3);
}

function drawTargetTrail(target) {
  if (target.hit) return;
  const scheme = targetSchemes[target.kind];
  const length = clamp(target.speed * .23, 26, 58) * target.direction;
  const gradient = context.createLinearGradient(target.x, 0, target.x - length, 0);
  gradient.addColorStop(0, `${scheme.edge}66`);
  gradient.addColorStop(1, `${scheme.edge}00`);
  context.fillStyle = gradient;
  context.beginPath();
  const trailingX = target.direction === 1 ? target.x : target.x + target.width;
  context.moveTo(trailingX, target.y + target.height * .23);
  context.lineTo(trailingX - length, target.y + target.height * .39);
  context.lineTo(trailingX - length, target.y + target.height * .68);
  context.lineTo(trailingX, target.y + target.height * .78);
  context.closePath();
  context.fill();
}

function drawTarget(target) {
  const { width, height } = target;
  const depthEdge = clamp(width * .09, 9, 17);
  const scheme = targetSchemes[target.kind];
  const cx = target.x + width / 2;
  const cy = target.y + height / 2;

  context.save();
  context.globalAlpha = target.alpha;

  // Ground-free drop shadow: it follows the flying object and sells the thickness.
  context.save();
  context.translate(cx + depthEdge * 1.25, cy + depthEdge * 1.45);
  context.rotate(target.rotation * .55);
  context.scale(1, .42);
  context.fillStyle = 'rgba(0, 18, 22, .28)';
  context.shadowColor = 'rgba(0,0,0,.28)';
  context.shadowBlur = 17 * target.depth;
  roundedRectPath(context, -width * .48, -height * .36, width * .96, height * .72, 10);
  context.fill();
  context.restore();

  context.translate(cx, cy);
  context.rotate(target.rotation);
  context.transform(1, target.tilt * .15, target.tilt * .55, 1, 0, 0);
  context.translate(-width / 2, -height / 2);

  // Top face.
  context.fillStyle = scheme.light;
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(depthEdge, -depthEdge);
  context.lineTo(width + depthEdge, -depthEdge);
  context.lineTo(width, 0);
  context.closePath();
  context.fill();
  context.strokeStyle = scheme.edge;
  context.lineWidth = 1.2;
  context.stroke();

  // Side face.
  context.fillStyle = scheme.dark;
  context.beginPath();
  context.moveTo(width, 0);
  context.lineTo(width + depthEdge, -depthEdge);
  context.lineTo(width + depthEdge, height - depthEdge);
  context.lineTo(width, height);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.24)';
  context.stroke();

  // Front face.
  const face = context.createLinearGradient(0, 0, 0, height);
  face.addColorStop(0, scheme.light);
  face.addColorStop(.16, scheme.front);
  face.addColorStop(.78, scheme.front);
  face.addColorStop(1, scheme.dark);
  context.fillStyle = face;
  roundedRectPath(context, 0, 0, width, height, clamp(height * .12, 5, 9));
  context.fill();
  context.strokeStyle = scheme.edge;
  context.lineWidth = Math.max(1.5, target.depth * 1.6);
  context.stroke();

  // Ticket geometry.
  context.fillStyle = scheme.stripe;
  context.fillRect(0, height * .18, width, height * .13);
  context.fillStyle = 'rgba(14, 26, 28, .82)';
  context.fillRect(width * .065, height * .42, width * .87, height * .38);
  context.fillStyle = 'rgba(255,255,255,.2)';
  context.fillRect(width * .065, height * .42, width * .87, 2);
  context.fillStyle = scheme.edge;
  context.font = `900 ${clamp(width * .086, 9, 14)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Brukerstøttesak', width / 2, height * .61, width * .81);

  context.fillStyle = 'rgba(17,34,34,.78)';
  context.font = `800 ${clamp(width * .055, 7, 9)}px ui-monospace, monospace`;
  context.textAlign = 'left';
  context.fillText(`#SM-${target.ticket}`, width * .08, height * .245);
  context.textAlign = 'right';
  context.fillText(target.kind === 'priority' ? 'HASTER' : target.kind === 'legacy' ? 'ELDRE SAK' : 'ÅPEN', width * .92, height * .245);

  // Corner fasteners and specular sheen.
  context.fillStyle = 'rgba(255,245,210,.7)';
  for (const [x, y] of [[8, 8], [width - 8, 8], [8, height - 8], [width - 8, height - 8]]) {
    context.beginPath();
    context.arc(x, y, clamp(target.depth * 1.7, 1.4, 2.4), 0, Math.PI * 2);
    context.fill();
  }
  const sheen = context.createLinearGradient(0, 0, width, height);
  sheen.addColorStop(0, 'rgba(255,255,255,.25)');
  sheen.addColorStop(.26, 'rgba(255,255,255,0)');
  sheen.addColorStop(.78, 'rgba(255,255,255,.08)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = sheen;
  roundedRectPath(context, 2, 2, width - 4, height - 4, 7);
  context.fill();

  if (target.hit) {
    context.save();
    context.translate(width * .51, height * .52);
    context.rotate(-.14);
    context.strokeStyle = '#f5ffd7';
    context.lineWidth = 3;
    context.strokeRect(-width * .27, -height * .19, width * .54, height * .38);
    context.fillStyle = '#f5ffd7';
    context.font = `950 ${clamp(width * .12, 12, 18)}px ui-monospace, monospace`;
    context.textAlign = 'center';
    context.fillText('LUKKET', 0, 1);
    context.restore();
  }

  context.restore();
}

function drawParticles() {
  for (const wave of shockwaves) {
    context.save();
    context.globalAlpha = clamp(wave.life / wave.maxLife, 0, 1);
    context.strokeStyle = wave.color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  for (const particle of particles) {
    context.save();
    context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
    context.fillStyle = 'rgba(255,255,255,.25)';
    context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, 2);
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

function drawSlowMotionField(now) {
  if (now >= slowUntil) return;
  const remaining = (slowUntil - now) / 1000;
  const pulse = .5 + Math.sin(now * .008) * .5;
  context.save();
  context.strokeStyle = `rgba(111,255,220,${.18 + pulse * .1})`;
  context.lineWidth = 2;
  const radius = Math.max(world.width, world.height) * (.42 + pulse * .02);
  context.beginPath();
  context.arc(world.width / 2, world.height * .48, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  ui.powerupTimer.textContent = `${remaining.toFixed(1).replace('.', ',')} s`;
}

function render(now) {
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  context.clearRect(0, 0, world.width, world.height);
  drawBackground(animationTime);

  const orderedTargets = [...targets].sort((a, b) => a.depth - b.depth);
  for (const target of orderedTargets) drawTargetTrail(target);
  for (const target of orderedTargets) drawTarget(target);
  drawParticles();
  if (confetti.length) drawConfetti();
  drawSlowMotionField(now);
}

function updatePowerup(now) {
  const active = now < slowUntil;
  ui.powerup.classList.toggle('is-active', active);
  board.classList.toggle('is-powerup', active);
  if (!active) ui.powerupTimer.textContent = '6,0 s';
}

function gameLoop(now) {
  const rawDelta = clamp((now - lastFrame) / 1000, 0, .045);
  lastFrame = now;
  const slowActive = now < slowUntil;
  const timeScale = slowActive ? .56 : 1;
  const active = state.status === 'running' && !paused && !quizActive && !quizPending;
  const delta = active ? rawDelta * timeScale : 0;
  animationTime += rawDelta * (active ? timeScale : .22);

  if (active) {
    spawnClock -= delta;
    const maxTargets = state.level <= 1 ? 2 : state.level <= 3 ? 3 : 4;
    if (spawnClock <= 0 && targets.filter((target) => !target.hit).length < maxTargets) {
      spawnTarget();
      const base = 1.18 - state.level * .12;
      spawnClock = randomBetween(Math.max(.46, base - .18), Math.max(.7, base + .28));
    }
    updateTargets(delta);
    updateParticles(delta);
    if (aim.hideAt && now > aim.hideAt) {
      aim.visible = false;
      aim.hideAt = 0;
      positionCrosshair();
    }
  }

  if (confetti.length) updateConfetti(rawDelta);
  updatePowerup(now);
  render(now);
  requestAnimationFrame(gameLoop);
}

function ensureAudio() {
  if (audioContext) {
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(frequency, duration, { type = 'square', gain = .035, delay = 0, endFrequency = null } = {}) {
  if (!soundEnabled) return;
  const audio = ensureAudio();
  if (!audio) return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const volume = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  volume.gain.setValueAtTime(.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + .01);
  volume.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

function playStartSound() {
  [196, 294, 392].forEach((frequency, index) => playTone(frequency, .12, { type: 'square', gain: .028, delay: index * .08 }));
}
function playShotSound() {
  playTone(125, .08, { type: 'sawtooth', gain: .055, endFrequency: 58 });
  playTone(58, .1, { type: 'square', gain: .03, endFrequency: 32 });
}
function playHitSound(streak) {
  playTone(420 + Math.min(streak, 6) * 30, .1, { type: 'square', gain: .03, delay: .03, endFrequency: 720 });
}
function playMissSound() { playTone(110, .1, { type: 'triangle', gain: .02, endFrequency: 82 }); }
function playEscapeSound() {
  playTone(185, .11, { type: 'square', gain: .025, endFrequency: 118 });
  playTone(120, .15, { type: 'square', gain: .02, delay: .1, endFrequency: 74 });
}
function playComboSound(streak) {
  const base = 330 + streak * 12;
  [base, base * 1.25, base * 1.5].forEach((frequency, index) => playTone(frequency, .09, { type: 'triangle', gain: .025, delay: index * .055 }));
}
function playLevelSound() {
  [220, 330, 440, 660].forEach((frequency, index) => playTone(frequency, .11, { type: 'square', gain: .024, delay: index * .07 }));
}
function playMissionSound() {
  playTone(523, .11, { type: 'triangle', gain: .022 });
  playTone(784, .14, { type: 'triangle', gain: .025, delay: .08 });
}
function playQuizOpenSound() {
  playTone(260, .11, { type: 'sine', gain: .025 });
  playTone(390, .13, { type: 'sine', gain: .022, delay: .08 });
}
function playQuizCorrectSound() {
  [392, 523, 659, 784].forEach((frequency, index) => playTone(frequency, .16, { type: 'triangle', gain: .028, delay: index * .075 }));
}
function playQuizWrongSound() {
  playTone(240, .18, { type: 'sawtooth', gain: .025, endFrequency: 120 });
  playTone(110, .22, { type: 'square', gain: .02, delay: .13, endFrequency: 70 });
}
function playWinSound() {
  const melody = [392, 523, 659, 784, 659, 784, 988];
  melody.forEach((frequency, index) => playTone(frequency, index === melody.length - 1 ? .42 : .16, { type: index % 2 ? 'triangle' : 'square', gain: .026, delay: index * .105 }));
}

function debugResolveCase() {
  if (state.status !== 'running' || paused || quizActive || quizPending) return false;
  const target = spawnTarget({
    direction: 1,
    depth: 1,
    width: 140,
    height: 58,
    x: world.width * .5 - 70,
    baseY: world.height * .38,
    speed: 0,
    kind: 'normal',
  });
  target.y = target.baseY;
  resolveShot(target, target.x + target.width / 2, target.y + target.height / 2);
  return true;
}

canvas.addEventListener('pointermove', (event) => {
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
});
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
  ensureAudio();
  shoot(point.x, point.y);
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p' && state.status === 'running' && !quizActive) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (state.status !== 'running' || paused || quizActive || quizPending) return;

  const step = event.shiftKey ? 34 : 20;
  let moved = true;
  if (key === 'arrowleft' || key === 'a') aim.x -= step;
  else if (key === 'arrowright' || key === 'd') aim.x += step;
  else if (key === 'arrowup' || key === 'w') aim.y -= step;
  else if (key === 'arrowdown' || key === 's') aim.y += step;
  else moved = false;

  if (moved) {
    event.preventDefault();
    setAim(aim.x, aim.y, 'keyboard');
    return;
  }

  if (key === ' ' || key === 'enter') {
    event.preventDefault();
    ensureAudio();
    aim.visible = true;
    positionCrosshair();
    shoot(aim.x, aim.y);
  }
});

ui.startButton.addEventListener('click', startRound);
ui.restartButton.addEventListener('click', startRound);
ui.resumeButton.addEventListener('click', () => togglePause(false));
ui.pauseButton.addEventListener('click', () => togglePause());
ui.soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  ui.soundButton.textContent = `Lyd: ${soundEnabled ? 'på' : 'av'}`;
  ui.soundButton.setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) {
    ensureAudio();
    playTone(440, .09, { type: 'triangle', gain: .025 });
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running' && !paused && !quizActive) togglePause(true);
});
window.addEventListener('resize', resizeCanvas, { passive: true });
new ResizeObserver(resizeCanvas).observe(board);

if (testMode) {
  window.__brukerstottejakten = {
    start: startRound,
    hit: debugResolveCase,
    answerCorrect: () => currentQuestion ? answerQuiz(currentQuestion.correct) : false,
    answerWrong: () => currentQuestion ? answerQuiz(currentQuestion.correct === 0 ? 1 : 0) : false,
    pause: () => togglePause(true),
    resume: () => togglePause(false),
    getState: () => ({ ...state, paused, quizActive, quizPending, slowActive: performance.now() < slowUntil }),
  };
}

resizeCanvas();
updateHud();
requestAnimationFrame(gameLoop);
