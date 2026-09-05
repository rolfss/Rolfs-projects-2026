import {
  TARGET_CASES,
  accuracyPercent,
  clamp,
  createGameState,
  elapsedSeconds,
  missionCount,
  performanceGrade,
  performanceScore,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  recordShot,
  shouldTriggerQuiz,
  startGame,
  unlockedMissions,
} from './game-core.js';
import { SceneRenderer } from './renderer.js';

const board = document.querySelector('#gameBoard');
const canvas = document.querySelector('#gameCanvas');
if (!board || !canvas) throw new Error('Spillflaten kunne ikke initialiseres.');

const ui = {
  appShell: document.querySelector('#appShell'),
  connectionPill: document.querySelector('#connectionPill'),
  dutyStatus: document.querySelector('#dutyStatus'),
  graphicsText: document.querySelector('#graphicsText'),
  soundButton: document.querySelector('#soundButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  pauseButton: document.querySelector('#pauseButton'),
  levelText: document.querySelector('#levelText'),
  levelName: document.querySelector('#levelName'),
  casesText: document.querySelector('#casesText'),
  pointsText: document.querySelector('#pointsText'),
  comboText: document.querySelector('#comboText'),
  comboCell: document.querySelector('#comboCell'),
  escalationsText: document.querySelector('#escalationsText'),
  missionCount: document.querySelector('#missionCount'),
  missionItems: [...document.querySelectorAll('[data-mission]')],
  radarCount: document.querySelector('#radarCount'),
  radarBlips: document.querySelector('#radarBlips'),
  powerupCard: document.querySelector('#powerupCard'),
  powerupTimer: document.querySelector('#powerupTimer'),
  weaponStatus: document.querySelector('#weaponStatus'),
  progressPercent: document.querySelector('#progressPercent'),
  progressTrack: document.querySelector('#progressTrack'),
  progressFill: document.querySelector('#progressFill'),
  remainingText: document.querySelector('#remainingText'),
  recordText: document.querySelector('#recordText'),
  reticle: document.querySelector('#reticle'),
  reticleLabel: document.querySelector('#reticleLabel'),
  statusMessage: document.querySelector('#statusMessage'),
  scorePop: document.querySelector('#scorePop'),
  levelBanner: document.querySelector('#levelBanner'),
  levelBannerName: document.querySelector('#levelBannerName'),
  levelBannerText: document.querySelector('#levelBannerText'),
  fxLayer: document.querySelector('#fxLayer'),
  startOverlay: document.querySelector('#startOverlay'),
  startButton: document.querySelector('#startButton'),
  quizOverlay: document.querySelector('#quizOverlay'),
  quizNumber: document.querySelector('#quizNumber'),
  quizTitle: document.querySelector('#quizTitle'),
  quizOptions: document.querySelector('#quizOptions'),
  quizFeedback: document.querySelector('#quizFeedback'),
  pauseOverlay: document.querySelector('#pauseOverlay'),
  resumeButton: document.querySelector('#resumeButton'),
  winOverlay: document.querySelector('#winOverlay'),
  restartButton: document.querySelector('#restartButton'),
  gradeMedallion: document.querySelector('#gradeMedallion'),
  gradeText: document.querySelector('#gradeText'),
  winSummary: document.querySelector('#winSummary'),
  resultPoints: document.querySelector('#resultPoints'),
  resultTitle: document.querySelector('#resultTitle'),
  resultAccuracy: document.querySelector('#resultAccuracy'),
  resultShots: document.querySelector('#resultShots'),
  resultCombo: document.querySelector('#resultCombo'),
  resultEscalations: document.querySelector('#resultEscalations'),
  resultQuiz: document.querySelector('#resultQuiz'),
  resultTime: document.querySelector('#resultTime'),
  badgeCount: document.querySelector('#badgeCount'),
  badgeRow: document.querySelector('#badgeRow'),
  fallbackNotice: document.querySelector('#fallbackNotice'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const testMode = new URLSearchParams(window.location.search).has('test');
const renderer = new SceneRenderer(canvas, { reducedMotion });
ui.graphicsText.textContent = renderer.info.label;
ui.fallbackNotice.hidden = renderer.info.mode !== 'canvas';

const LEVELS = [
  { name: 'Førstelinje', subtitle: 'Rolig innføring. Finn rytmen.', maxTargets: 2, speed: 2.55, interval: [1.02, 1.42] },
  { name: 'SLA-koordinator', subtitle: 'Flere saker. Høyere tempo.', maxTargets: 3, speed: 3.05, interval: [.82, 1.2] },
  { name: 'Problemløser', subtitle: 'Kritiske saker entrer luftrommet.', maxTargets: 4, speed: 3.55, interval: [.65, 1.02] },
  { name: 'Hovedhendelse', subtitle: 'Én siste kritisk sak. Lukk den.', maxTargets: 1, speed: 3.35, interval: [.52, .72] },
];

const MISSION_LABELS = {
  triage: 'Stabiliser køen',
  flow: 'Ren arbeidsflyt',
  priority: 'SLA-redning',
  noark: 'Noark-klar',
  control: 'Full køkontroll',
};

const POSITIVE_MESSAGES = [
  'Sak løst og lukket.',
  'Riktig kø. Riktig tiltak.',
  'SLA reddet.',
  'Dokumentert. Verifisert. Lukket.',
  'Førstelinjen jubler.',
  'Ingen restanse her.',
  'Løst før neste statusmøte.',
  'Saksflyt i verdensklasse.',
];

const NOARK_QUESTIONS = [
  {
    question: 'Hva er Noark 5?',
    options: ['En standard for elektronisk arkivdanning', 'Et program for videomøter'],
    correct: 0,
    explanation: 'Noark 5 beskriver krav til arkivstruktur, metadata og funksjonalitet for elektronisk arkivdanning.',
  },
  {
    question: 'Skal metadata bidra til at dokumentasjon kan finnes og forstås?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'Metadata bevarer sammenheng og gjør dokumentasjon søkbar og forståelig over tid.',
  },
  {
    question: 'Kan et fagsystem integreres med en Noark 5-kjerne?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'En Noark-kjerne kan motta og forvalte arkivinformasjon fra ett eller flere fagsystemer.',
  },
  {
    question: 'Er en journalpost og et dokument alltid det samme?',
    options: ['Nei', 'Ja'],
    correct: 0,
    explanation: 'En journalpost er en registrering og kan være knyttet til et hoveddokument og vedlegg.',
  },
  {
    question: 'Betyr bevaring og kassasjon det samme?',
    options: ['Nei', 'Ja'],
    correct: 0,
    explanation: 'Bevaring betyr at materialet skal tas vare på. Kassasjon betyr at det kan destrueres etter fastsatte regler.',
  },
  {
    question: 'Kan tilgang og skjerming styres ved hjelp av registrerte opplysninger?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'Tilgangskoder, autorisasjon og skjermingsopplysninger kan styre hva ulike brukere får se.',
  },
  {
    question: 'Kan en journalpost være knyttet til både hoveddokument og vedlegg?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'En journalpost kan ha et hoveddokument og ett eller flere vedlegg.',
  },
  {
    question: 'Er Noark 5 bare ett bestemt filformat?',
    options: ['Nei', 'Ja'],
    correct: 0,
    explanation: 'Noark 5 er en kravstandard for arkivdanning, ikke bare et enkelt filformat.',
  },
  {
    question: 'Bør dokumentets kontekst bevares sammen med dokumentasjonen?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'Kontekst og metadata er sentrale for å forstå hvem som skapte dokumentasjonen, hvorfor og i hvilken sammenheng.',
  },
  {
    question: 'Kan et arkivuttrekk brukes for langtidsbevaring utenfor originalsystemet?',
    options: ['Ja', 'Nei'],
    correct: 0,
    explanation: 'Et strukturert arkivuttrekk gjør det mulig å bevare arkivinformasjon uavhengig av originalsystemet.',
  },
];

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.ambientTimer = 0;
    this.ambientStep = 0;
    this.running = false;
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -22;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = .004;
    this.compressor.release.value = .18;
    this.master = this.context.createGain();
    this.master.gain.value = .8;
    this.compressor.connect(this.master);
    this.master.connect(this.context.destination);
    return this.context;
  }

  tone(frequency, duration, { type = 'sine', gain = .025, delay = 0, endFrequency = null, pan = 0 } = {}) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    volume.gain.setValueAtTime(.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain, start + Math.min(.012, duration * .2));
    volume.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(volume);
    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      volume.connect(panner);
      panner.connect(this.compressor);
    } else {
      volume.connect(this.compressor);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  noise(duration = .08, gain = .02) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context) return;
    const sampleCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 920;
    filter.Q.value = .8;
    volume.gain.setValueAtTime(gain, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(volume);
    volume.connect(this.compressor);
    source.start();
  }

  startAmbient() {
    this.running = true;
    if (!this.enabled || this.ambientTimer) return;
    this.ensure();
    const notes = [98, 123.47, 146.83, 123.47, 110, 138.59, 164.81, 138.59];
    const tick = () => {
      if (!this.running || !this.enabled) return;
      const note = notes[this.ambientStep % notes.length];
      this.tone(note, .48, { type: 'triangle', gain: .006 });
      if (this.ambientStep % 2 === 0) this.tone(note * 2, .16, { type: 'sine', gain: .0035, delay: .08 });
      this.ambientStep += 1;
    };
    tick();
    this.ambientTimer = window.setInterval(tick, 520);
  }

  stopAmbient() {
    this.running = false;
    if (this.ambientTimer) window.clearInterval(this.ambientTimer);
    this.ambientTimer = 0;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopAmbient();
      if (this.master) this.master.gain.setTargetAtTime(.0001, this.context.currentTime, .03);
    } else {
      this.ensure();
      if (this.master) this.master.gain.setTargetAtTime(.8, this.context.currentTime, .03);
      if (state.status === 'running' && !paused) this.startAmbient();
      this.tone(440, .09, { type: 'triangle', gain: .02 });
    }
  }

  start() {
    [196, 293.66, 392].forEach((frequency, index) => this.tone(frequency, .13, { type: 'triangle', gain: .022, delay: index * .08 }));
    this.startAmbient();
  }
  shot() {
    this.noise(.075, .026);
    this.tone(135, .085, { type: 'sawtooth', gain: .045, endFrequency: 52 });
    this.tone(62, .11, { type: 'square', gain: .022, endFrequency: 31 });
  }
  hit(streak, pan = 0) {
    this.tone(390 + Math.min(streak, 7) * 35, .1, { type: 'square', gain: .024, delay: .025, endFrequency: 720, pan });
    this.tone(760, .08, { type: 'triangle', gain: .014, delay: .06, pan });
  }
  miss() { this.tone(115, .11, { type: 'triangle', gain: .017, endFrequency: 77 }); }
  escape() {
    this.tone(190, .13, { type: 'square', gain: .021, endFrequency: 112 });
    this.tone(112, .17, { type: 'square', gain: .016, delay: .1, endFrequency: 62 });
  }
  combo(streak) {
    const base = 300 + streak * 18;
    [base, base * 1.25, base * 1.5].forEach((frequency, index) => this.tone(frequency, .1, { type: 'triangle', gain: .02, delay: index * .055 }));
  }
  level() {
    [220, 330, 440, 660, 880].forEach((frequency, index) => this.tone(frequency, .12, { type: index % 2 ? 'triangle' : 'square', gain: .02, delay: index * .06 }));
  }
  mission() {
    this.tone(523.25, .11, { type: 'triangle', gain: .018 });
    this.tone(783.99, .14, { type: 'triangle', gain: .021, delay: .08 });
  }
  quizOpen() {
    this.tone(261.63, .12, { type: 'sine', gain: .02 });
    this.tone(392, .14, { type: 'sine', gain: .018, delay: .08 });
  }
  quizCorrect() {
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => this.tone(frequency, .16, { type: 'triangle', gain: .023, delay: index * .075 }));
  }
  quizWrong() {
    this.tone(235, .19, { type: 'sawtooth', gain: .022, endFrequency: 110 });
    this.tone(105, .22, { type: 'square', gain: .016, delay: .13, endFrequency: 62 });
  }
  major() {
    this.tone(82.41, .52, { type: 'sawtooth', gain: .025, endFrequency: 55 });
    this.tone(123.47, .32, { type: 'square', gain: .018, delay: .18, endFrequency: 92 });
    this.tone(164.81, .28, { type: 'triangle', gain: .017, delay: .46, endFrequency: 246.94 });
  }
  win() {
    const melody = [392, 523.25, 659.25, 783.99, 659.25, 783.99, 987.77];
    melody.forEach((frequency, index) => this.tone(frequency, index === melody.length - 1 ? .46 : .17, {
      type: index % 2 ? 'triangle' : 'square',
      gain: .024,
      delay: index * .105,
    }));
  }
}

const sound = new SoundEngine();
let state = createGameState();
let targets = [];
let targetId = 1;
let spawnClock = 0;
let lastFrame = performance.now();
let radarClock = 0;
let statusTimer = 0;
let overlayTimer = 0;
let levelTimer = 0;
let paused = false;
let quizActive = false;
let quizPending = false;
let currentQuestion = null;
let questionDeck = [];
let questionIndex = 0;
let slowUntil = 0;
let pendingWin = false;
let finaleAnnounced = false;
let roundToken = 0;
let missionSnapshot = { triage: false, flow: false, priority: false, noark: false, control: false };
let highRecord = readRecord();

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

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function readRecord() {
  try {
    const record = JSON.parse(window.localStorage.getItem('brukerstottejakten-v3-record') || 'null');
    return record && Number.isFinite(record.performance) ? record : null;
  } catch {
    return null;
  }
}

function writeRecord(record) {
  try {
    window.localStorage.setItem('brukerstottejakten-v3-record', JSON.stringify(record));
  } catch {
    // Lokal lagring er valgfri. Spillet fortsetter uten den.
  }
}

function showOverlay(overlay) {
  if (!overlay) return;
  window.clearTimeout(overlayTimer);
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function hideOverlay(overlay) {
  if (!overlay || overlay.hidden) return;
  overlay.classList.remove('is-visible');
  window.clearTimeout(overlayTimer);
  overlayTimer = window.setTimeout(() => {
    if (!overlay.classList.contains('is-visible')) overlay.hidden = true;
  }, 220);
}

function showMessage(text, bad = false, duration = 820) {
  window.clearTimeout(statusTimer);
  ui.statusMessage.textContent = text;
  ui.statusMessage.classList.toggle('is-bad', bad);
  ui.statusMessage.classList.add('is-visible');
  statusTimer = window.setTimeout(() => ui.statusMessage.classList.remove('is-visible'), duration);
}

function showScorePop(text, x = aim.x, y = aim.y) {
  ui.scorePop.textContent = text;
  ui.scorePop.style.left = `${clamp(x, 55, renderer.width - 55)}px`;
  ui.scorePop.style.top = `${clamp(y, 88, renderer.height - 90)}px`;
  ui.scorePop.classList.remove('is-popping');
  void ui.scorePop.offsetWidth;
  ui.scorePop.classList.add('is-popping');
}

function showImpact(x, y, bad = false) {
  const ring = document.createElement('span');
  ring.className = 'impact-ring';
  if (bad) ring.style.setProperty('--gold', '#ff6f68');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ui.fxLayer.append(ring);
  window.setTimeout(() => ring.remove(), 680);
}

function spawnConfetti() {
  ui.fxLayer.querySelectorAll('.confetti-piece').forEach((piece) => piece.remove());
  const colors = ['#ffd85a', '#5be0c1', '#f17b48', '#f8f1d7', '#7baaf7', '#f08bb5'];
  const count = reducedMotion ? 28 : 88;
  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--delay', `${Math.random() * .8}s`);
    piece.style.setProperty('--duration', `${2.8 + Math.random() * 2.4}s`);
    piece.style.setProperty('--drift', `${-70 + Math.random() * 140}px`);
    piece.style.setProperty('--spin', `${180 + Math.random() * 780}deg`);
    piece.style.setProperty('--color', colors[index % colors.length]);
    piece.style.setProperty('--size', `${5 + Math.random() * 8}px`);
    ui.fxLayer.append(piece);
    window.setTimeout(() => piece.remove(), 6_200);
  }
}

function updateHud({ announceMissions = false } = {}) {
  const level = LEVELS[state.level - 1];
  const percent = Math.round(progressPercent(state.casesSolved));
  const remaining = Math.max(0, TARGET_CASES - state.casesSolved);
  const online = state.status === 'running' && !paused && !quizActive && !quizPending && !pendingWin;

  ui.levelText.textContent = String(state.level).padStart(2, '0');
  ui.levelName.textContent = level.name;
  ui.casesText.innerHTML = `${state.casesSolved}<span>/${TARGET_CASES}</span>`;
  ui.pointsText.innerHTML = `${state.points}<span> p</span>`;
  ui.comboText.textContent = `x${state.streak}`;
  ui.escalationsText.textContent = String(state.escalations);
  ui.progressPercent.textContent = `${percent} %`;
  ui.progressFill.style.width = `${percent}%`;
  ui.progressTrack.setAttribute('aria-valuenow', String(state.casesSolved));
  ui.remainingText.textContent = String(remaining);
  ui.recordText.textContent = highRecord ? `Rekord: ${highRecord.performance.toFixed(1).replace('.', ',')}` : 'Rekord: —';

  let duty = 'Frakoblet';
  if (state.status === 'won') duty = 'Fullført';
  else if (quizActive || quizPending) duty = 'Fagtest';
  else if (paused) duty = 'Pause';
  else if (state.status === 'running') duty = 'Pålogget';
  ui.dutyStatus.textContent = duty;
  ui.connectionPill.classList.toggle('is-online', online);
  ui.connectionPill.classList.toggle('is-paused', paused || quizActive || quizPending);
  ui.connectionPill.classList.toggle('is-complete', state.status === 'won');
  ui.pauseButton.disabled = state.status !== 'running' || quizActive || quizPending || pendingWin;
  ui.pauseButton.setAttribute('aria-pressed', String(paused));
  ui.pauseButton.querySelector('b').textContent = paused ? 'Fortsett' : 'Pause';
  ui.weaponStatus.textContent = online ? 'Klar' : quizActive || quizPending ? 'Låst' : paused ? 'Pause' : state.status === 'won' ? 'Fullført' : 'Klar';

  const missions = unlockedMissions(state);
  const newlyUnlocked = [];
  for (const item of ui.missionItems) {
    const name = item.dataset.mission;
    const complete = Boolean(missions[name]);
    item.classList.toggle('is-complete', complete);
    const status = item.querySelector('em');
    if (status) status.textContent = complete ? 'Fullført' : 'Venter';
    if (announceMissions && complete && !missionSnapshot[name]) newlyUnlocked.push(name);
  }
  ui.missionCount.textContent = `${missionCount(state)}/5`;
  missionSnapshot = missions;

  if (newlyUnlocked.length) {
    const name = newlyUnlocked[0];
    window.setTimeout(() => {
      showMessage(`Utmerkelse låst opp: ${MISSION_LABELS[name]}`);
      sound.mission();
    }, 180);
  }
}

function showLevelBanner(levelNumber) {
  const level = LEVELS[levelNumber - 1];
  ui.levelBannerName.textContent = level.name;
  ui.levelBannerText.textContent = level.subtitle;
  ui.levelBanner.classList.remove('is-visible');
  void ui.levelBanner.offsetWidth;
  ui.levelBanner.classList.add('is-visible');
  window.clearTimeout(levelTimer);
  levelTimer = window.setTimeout(() => ui.levelBanner.classList.remove('is-visible'), 1_900);
  renderer.pulseLevel();
  sound.level();
}

function updatePowerup(now) {
  const active = now < slowUntil;
  const remaining = Math.max(0, (slowUntil - now) / 1000);
  ui.powerupCard.classList.toggle('is-active', active);
  board.classList.toggle('is-slow', active);
  ui.powerupTimer.textContent = `${remaining.toFixed(1).replace('.', ',')} s`;
  renderer.setSlowMode(active);
}

function updateRadar() {
  const activeTargets = targets.filter((target) => !target.hit);
  ui.radarCount.textContent = String(activeTargets.length);
  const fragment = document.createDocumentFragment();
  for (const target of activeTargets.slice(0, 9)) {
    const blip = document.createElement('span');
    blip.className = `radar-blip ${target.kind}`;
    const distance = clamp((Math.abs(target.z) - 7) / 20, 0, 1);
    const horizontalRange = Math.abs(target.z) * .75 * renderer.aspect + 5;
    const x = clamp(50 + (target.x / horizontalRange) * 43, 7, 93);
    const y = clamp(84 - distance * 72, 9, 88);
    blip.style.left = `${x}%`;
    blip.style.top = `${y}%`;
    fragment.append(blip);
  }
  ui.radarBlips.replaceChildren(fragment);
}

function resize() {
  renderer.resize();
  if (!aim.x && !aim.y) {
    aim.x = renderer.width / 2;
    aim.y = renderer.height * .45;
  } else {
    aim.x = clamp(aim.x, 0, renderer.width);
    aim.y = clamp(aim.y, 0, renderer.height);
  }
  setAim(aim.x, aim.y, aim.pointerType, false);
}

function setAim(x, y, pointerType = 'mouse', reveal = true) {
  aim.x = clamp(x, 0, renderer.width);
  aim.y = clamp(y, 0, renderer.height);
  aim.pointerType = pointerType;
  if (reveal) aim.visible = true;
  aim.hideAt = pointerType === 'touch' ? performance.now() + 520 : 0;
  const normalizedX = (aim.x / Math.max(1, renderer.width)) * 2 - 1;
  const normalizedY = (aim.y / Math.max(1, renderer.height)) * 2 - 1;
  renderer.setAim(normalizedX, normalizedY);
  positionReticle();
}

function positionReticle() {
  ui.reticle.style.left = `${aim.x}px`;
  ui.reticle.style.top = `${aim.y}px`;
  const visible = aim.visible && state.status === 'running' && !paused && !quizActive && !quizPending && !pendingWin;
  ui.reticle.classList.toggle('is-visible', visible);
}

function updateReticleLock() {
  if (!aim.visible || state.status !== 'running' || paused || quizActive || quizPending || pendingWin) {
    ui.reticle.classList.remove('is-locked');
    ui.reticleLabel.textContent = 'SM';
    return;
  }
  const target = renderer.getTargetAt(aim.x, aim.y, targets);
  ui.reticle.classList.toggle('is-locked', Boolean(target));
  ui.reticleLabel.textContent = target ? (target.kind === 'major' ? 'HOVEDHENDELSE' : 'MÅL LÅST') : 'SM';
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * renderer.width,
    y: ((event.clientY - rect.top) / rect.height) * renderer.height,
  };
}

function targetHorizontalLimit(target) {
  const distance = Math.abs(target.z - 7.8);
  return Math.tan((renderer.width < 720 ? 61 : 54) * Math.PI / 360) * distance * renderer.aspect + target.width * 1.2;
}

function chooseTargetKind(level) {
  const roll = Math.random();
  const priorityChance = level >= 4 ? .34 : level >= 3 ? .25 : level >= 2 ? .13 : .05;
  const legacyChance = level >= 2 ? .15 : .08;
  if (roll < priorityChance) return 'priority';
  if (roll < priorityChance + legacyChance) return 'legacy';
  return 'normal';
}

function createTarget(overrides = {}) {
  const level = LEVELS[state.level - 1];
  const direction = overrides.direction ?? (Math.random() < .5 ? 1 : -1);
  const kind = overrides.kind ?? (state.casesSolved >= TARGET_CASES - 1 ? 'major' : chooseTargetKind(state.level));
  const z = overrides.z ?? (kind === 'major' ? -13.8 : -randomBetween(8.5, 23.5));
  const size = overrides.size ?? (kind === 'major' ? 1.58 : randomBetween(.86, 1.18));
  const width = (kind === 'major' ? 3.18 : 2.75) * size;
  const height = (kind === 'major' ? 1.48 : 1.3) * size;
  const depth = (kind === 'major' ? .62 : .52) * size;
  const limit = Math.tan((renderer.width < 720 ? 61 : 54) * Math.PI / 360) * Math.abs(z - 7.8) * renderer.aspect;
  const baseY = overrides.baseY ?? (kind === 'major' ? 2.35 : randomBetween(.35, 4.7));
  const kindSpeed = kind === 'major' ? .88 : kind === 'priority' ? 1.24 : kind === 'legacy' ? .87 : 1;
  const depthSpeed = .86 + Math.abs(z) / 48;
  const target = {
    id: targetId,
    direction,
    kind,
    x: overrides.x ?? (kind === 'major' ? direction * -limit * .86 : direction === 1 ? -limit - width * 1.3 : limit + width * 1.3),
    y: baseY,
    z,
    baseY,
    baseZ: z,
    width,
    height,
    depth,
    speed: overrides.speed ?? level.speed * kindSpeed * depthSpeed * randomBetween(.9, 1.1),
    amplitude: kind === 'major' ? .22 : kind === 'legacy' ? randomBetween(.55, .95) : randomBetween(.25, .7),
    waveSpeed: kind === 'major' ? 1.08 : kind === 'priority' ? randomBetween(2.3, 3.5) : randomBetween(1.35, 2.65),
    phase: Math.random() * Math.PI * 2,
    age: 0,
    pitch: 0,
    yaw: direction * -.08,
    roll: randomBetween(-.08, .08),
    hit: false,
    hitAge: 0,
    opacity: 1,
    vx: 0,
    vy: 0,
    vz: 0,
  };
  targetId += 1;
  return target;
}

function spawnTarget(overrides = {}) {
  const target = createTarget(overrides);
  targets.push(target);
  if (target.kind === 'major' && !finaleAnnounced) {
    finaleAnnounced = true;
    board.classList.add('is-finale');
    showMessage('HOVEDHENDELSE: Den siste saken er i luftrommet.', false, 1_350);
    sound.major();
    renderer.pulseLevel();
  }
  return target;
}

function updateTargets(delta, rawDelta) {
  const escaped = [];
  for (const target of targets) {
    if (target.hit) {
      target.hitAge += rawDelta;
      target.x += target.vx * rawDelta;
      target.y += target.vy * rawDelta;
      target.z += target.vz * rawDelta;
      target.vy -= 6.8 * rawDelta;
      target.pitch += 2.7 * rawDelta * target.direction;
      target.yaw += 3.8 * rawDelta;
      target.roll += 5.1 * rawDelta * target.direction;
      target.opacity = clamp(1 - Math.max(0, target.hitAge - .42) / .68, 0, 1);
      continue;
    }

    if (delta <= 0) continue;
    target.age += delta;
    target.x += target.speed * target.direction * delta;
    target.y = target.baseY + Math.sin(target.age * target.waveSpeed + target.phase) * target.amplitude;
    target.z = target.baseZ + Math.sin(target.age * .72 + target.phase) * (target.kind === 'major' ? .14 : target.kind === 'legacy' ? .75 : .32);
    target.roll = Math.sin(target.age * target.waveSpeed * .66 + target.phase) * (target.kind === 'major' ? .035 : target.kind === 'legacy' ? .19 : .09);
    target.yaw = target.direction * -.1 + Math.sin(target.age * .88 + target.phase) * .17;
    target.pitch = Math.sin(target.age * 1.13 + target.phase) * .06;

    const limit = targetHorizontalLimit(target);
    if ((target.direction === 1 && target.x > limit) || (target.direction === -1 && target.x < -limit)) escaped.push(target);
  }

  if (escaped.length && state.status === 'running') {
    for (const target of escaped) {
      state = recordEscape(state);
      renderer.emitEscape(target);
    }
    const majorEscaped = escaped.some((target) => target.kind === 'major');
    showMessage(majorEscaped ? 'Hovedhendelsen ble eskalert. Ny instans opprettes.' : escaped.length > 1 ? 'Flere saker ble eskalert.' : 'En sak ble eskalert.', true, majorEscaped ? 1_150 : 860);
    sound.escape();
    if (majorEscaped) {
      finaleAnnounced = false;
      spawnClock = .48;
    }
    updateHud();
  }

  targets = targets.filter((target) => !escaped.includes(target) && !(target.hit && target.hitAge > 1.16));
}

function triggerRecoil() {
  ui.reticle.classList.remove('is-firing');
  board.classList.remove('is-shaking');
  void ui.reticle.offsetWidth;
  ui.reticle.classList.add('is-firing');
  if (!reducedMotion) board.classList.add('is-shaking');
  window.setTimeout(() => {
    ui.reticle.classList.remove('is-firing');
    board.classList.remove('is-shaking');
  }, 210);
}

function resolveShot(target, x, y, quizRoll = Math.random()) {
  if (state.status !== 'running' || paused || quizActive || quizPending || pendingWin) return false;
  const previousLevel = state.level;
  state = recordShot(state, Boolean(target), Date.now(), target?.kind || 'normal');
  renderer.fire(target);
  triggerRecoil();
  sound.shot();

  if (!target) {
    showMessage('Bom. Saken fortsetter mot eskalering.', true, 620);
    showImpact(x, y, true);
    sound.miss();
    updateHud();
    return false;
  }

  target.hit = true;
  target.hitAge = 0;
  target.vx = target.direction * .7;
  target.vy = 1.2 + Math.random() * .7;
  target.vz = 1.4 + Math.random() * 1.1;
  renderer.emitHit(target);
  const pan = clamp((x / Math.max(1, renderer.width)) * 2 - 1, -1, 1);
  sound.hit(state.streak, pan);
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(target.kind === 'major' ? [35, 20, 45] : target.kind === 'priority' ? [18, 16, 25] : 18);
  showImpact(x, y);
  showScorePop(target.kind === 'major' ? '+1 • HOVEDHENDELSE LUKKET' : target.kind === 'priority' ? '+1 • SLA REDDET' : '+1 SAK', x, y);
  showMessage(state.casesSolved === TARGET_CASES ? 'Alle saker er løst.' : POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)]);

  if (state.streak >= 3) {
    ui.comboCell.classList.remove('is-hot');
    void ui.comboCell.offsetWidth;
    ui.comboCell.classList.add('is-hot');
    if (state.streak % 3 === 0) {
      showScorePop(`SLA-SERIE x${state.streak}`, x, y - 28);
      sound.combo(state.streak);
    }
  }

  updateHud({ announceMissions: true });

  if (state.level > previousLevel) {
    if (state.level === 4) {
      finaleAnnounced = false;
      spawnClock = .62;
      for (const candidate of targets) {
        if (candidate === target || candidate.hit) continue;
        candidate.hit = true;
        candidate.hitAge = .18;
        candidate.vy = .65;
        candidate.vx = candidate.direction * .28;
        candidate.vz = .9;
      }
    }
    window.setTimeout(() => showLevelBanner(state.level), 240);
  }

  if (state.status === 'won') {
    pendingWin = true;
    targets.forEach((candidate) => {
      if (!candidate.hit) {
        candidate.hit = true;
        candidate.hitAge = .2;
        candidate.vy = .7;
        candidate.vx = candidate.direction * .35;
        candidate.vz = .8;
      }
    });
    const token = roundToken;
    window.setTimeout(() => {
      if (token === roundToken) finishRound();
    }, testMode ? 80 : 950);
    return true;
  }

  if (shouldTriggerQuiz(true, quizRoll, quizActive || quizPending || pendingWin)) {
    quizPending = true;
    updateHud();
    const token = roundToken;
    window.setTimeout(() => {
      if (token === roundToken) openQuiz();
    }, testMode ? 35 : 560);
  }
  return true;
}

function shoot(x, y) {
  const target = renderer.getTargetAt(x, y, targets);
  return resolveShot(target, x, y);
}

function nextQuestion() {
  if (!questionDeck.length || questionIndex >= questionDeck.length) {
    questionDeck = shuffle(NOARK_QUESTIONS);
    questionIndex = 0;
  }
  const question = questionDeck[questionIndex];
  questionIndex += 1;
  return question;
}

function openQuiz() {
  if (state.status !== 'running' || pendingWin) {
    quizPending = false;
    return;
  }
  quizActive = true;
  quizPending = false;
  currentQuestion = nextQuestion();
  ui.quizNumber.textContent = `Fagtest ${state.quizAnswered + 1}`;
  ui.quizTitle.textContent = currentQuestion.question;
  ui.quizFeedback.textContent = '';
  ui.quizFeedback.className = 'quiz-feedback';
  ui.quizOptions.replaceChildren();

  currentQuestion.options.forEach((option, optionIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.textContent = option;
    button.addEventListener('click', () => answerQuiz(optionIndex));
    ui.quizOptions.append(button);
  });

  updateHud();
  positionReticle();
  sound.stopAmbient();
  sound.quizOpen();
  showOverlay(ui.quizOverlay);
  window.setTimeout(() => ui.quizOptions.querySelector('button')?.focus({ preventScroll: true }), 40);
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
  ui.quizFeedback.textContent = correct
    ? `${currentQuestion.explanation} +1 poeng og seks sekunder faglig flyt.`
    : `Ikke helt. ${currentQuestion.explanation} −1 poeng.`;

  if (correct) {
    slowUntil = performance.now() + 6_000;
    showScorePop('+1 NOARK', renderer.width / 2, renderer.height * .42);
    sound.quizCorrect();
  } else {
    board.classList.remove('is-danger');
    void board.offsetWidth;
    board.classList.add('is-danger');
    showScorePop('−1 POENG', renderer.width / 2, renderer.height * .42);
    sound.quizWrong();
  }
  updateHud({ announceMissions: true });

  const token = roundToken;
  window.setTimeout(() => {
    if (token !== roundToken) return;
    quizActive = false;
    currentQuestion = null;
    hideOverlay(ui.quizOverlay);
    updateHud();
    positionReticle();
    if (sound.enabled && state.status === 'running' && !paused) sound.startAmbient();
    canvas.focus({ preventScroll: true });
  }, testMode ? 70 : 1_480);
  return correct;
}

function togglePause(force) {
  if (state.status !== 'running' || quizActive || quizPending || pendingWin) return;
  paused = typeof force === 'boolean' ? force : !paused;
  if (paused) {
    showOverlay(ui.pauseOverlay);
    ui.resumeButton.focus({ preventScroll: true });
    sound.stopAmbient();
  } else {
    hideOverlay(ui.pauseOverlay);
    if (sound.enabled) sound.startAmbient();
    canvas.focus({ preventScroll: true });
  }
  updateHud();
  positionReticle();
}

function startRound() {
  roundToken += 1;
  state = startGame(state);
  targets = [];
  targetId = 1;
  spawnClock = .24;
  paused = false;
  quizActive = false;
  quizPending = false;
  currentQuestion = null;
  questionDeck = shuffle(NOARK_QUESTIONS);
  questionIndex = 0;
  slowUntil = 0;
  pendingWin = false;
  finaleAnnounced = false;
  missionSnapshot = { triage: false, flow: false, priority: false, noark: false, control: false };
  ui.fxLayer.querySelectorAll('.confetti-piece').forEach((piece) => piece.remove());
  renderer.setProgress(0);
  renderer.setSlowMode(false);

  aim.x = renderer.width / 2;
  aim.y = Math.max(100, renderer.height * .43);
  aim.visible = true;
  aim.pointerType = 'keyboard';
  aim.hideAt = 0;
  setAim(aim.x, aim.y, 'keyboard');

  hideOverlay(ui.startOverlay);
  hideOverlay(ui.quizOverlay);
  hideOverlay(ui.pauseOverlay);
  hideOverlay(ui.winOverlay);
  board.classList.remove('is-danger', 'is-slow', 'is-finale');
  updateHud();
  updateRadar();
  showMessage('Service Manager er pålogget. Operasjonen starter.');
  sound.ensure();
  sound.start();
  canvas.focus({ preventScroll: true });
}

function renderBadges() {
  const missions = unlockedMissions(state);
  ui.badgeRow.replaceChildren();
  for (const [name, complete] of Object.entries(missions)) {
    if (!complete) continue;
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.textContent = MISSION_LABELS[name];
    ui.badgeRow.append(badge);
  }
  if (!ui.badgeRow.children.length) {
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.textContent = 'Vakten fullført';
    ui.badgeRow.append(badge);
  }
  ui.badgeCount.textContent = `${missionCount(state)}/5`;
}

function finishRound() {
  if (state.status !== 'won') return;
  pendingWin = false;
  board.classList.remove('is-finale');
  const now = Date.now();
  const seconds = elapsedSeconds(state, now);
  const accuracy = Math.round(accuracyPercent(state));
  const performance = performanceScore(state, now);
  const grade = performanceGrade(state, now);
  const result = {
    performance,
    points: state.points,
    accuracy,
    seconds,
    grade: grade.grade,
    date: now,
  };
  if (!highRecord || result.performance > highRecord.performance || (result.performance === highRecord.performance && result.seconds < highRecord.seconds)) {
    highRecord = result;
    writeRecord(result);
  }

  ui.gradeText.textContent = grade.grade;
  ui.gradeMedallion.dataset.grade = grade.grade;
  ui.winSummary.textContent = `Ti saker er lukket på ${seconds.toFixed(1).replace('.', ',')} sekunder. Service Manager registrerer en vakt på nivå «${grade.title}».`;
  ui.resultPoints.textContent = `${state.points} p`;
  ui.resultTitle.textContent = grade.title;
  ui.resultAccuracy.textContent = `${accuracy} %`;
  ui.resultShots.textContent = `${state.shots} skudd`;
  ui.resultCombo.textContent = `x${state.bestStreak}`;
  ui.resultEscalations.textContent = `${state.escalations} eskalert`;
  ui.resultQuiz.textContent = `${state.quizCorrect}/${state.quizAnswered}`;
  ui.resultTime.textContent = `${seconds.toFixed(1).replace('.', ',')} sek`;
  renderBadges();
  updateHud();
  positionReticle();
  sound.stopAmbient();
  sound.win();
  renderer.pulseLevel();
  spawnConfetti();
  showOverlay(ui.winOverlay);
  ui.restartButton.focus({ preventScroll: true });
}

function gameLoop(now) {
  const rawDelta = clamp((now - lastFrame) / 1000, 0, .05);
  lastFrame = now;
  const slowActive = now < slowUntil;
  const active = state.status === 'running' && !paused && !quizActive && !quizPending && !pendingWin;
  const delta = active ? rawDelta * (slowActive ? .52 : 1) : 0;

  renderer.update(rawDelta);
  renderer.setProgress(state.casesSolved / TARGET_CASES);
  updatePowerup(now);

  updateTargets(delta, rawDelta);
  if (active) {
    spawnClock -= delta;
    const level = LEVELS[state.level - 1];
    const finale = state.casesSolved === TARGET_CASES - 1;
    const liveTargets = targets.filter((target) => !target.hit).length;
    const maxTargets = finale ? 1 : level.maxTargets;
    if (spawnClock <= 0 && liveTargets < maxTargets) {
      spawnTarget(finale ? { kind: 'major' } : {});
      spawnClock = randomBetween(level.interval[0], level.interval[1]);
    }
    if (aim.hideAt && now > aim.hideAt) {
      aim.visible = false;
      aim.hideAt = 0;
      positionReticle();
    }
  }

  renderer.render({ targets, state });
  updateReticleLock();
  radarClock -= rawDelta;
  if (radarClock <= 0) {
    updateRadar();
    radarClock = .09;
  }
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('pointermove', (event) => {
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
});
canvas.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse') {
    aim.visible = false;
    positionReticle();
  }
});
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  event.preventDefault();
  const point = pointerPosition(event);
  setAim(point.x, point.y, event.pointerType || 'mouse');
  sound.ensure();
  shoot(point.x, point.y);
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p' && state.status === 'running' && !quizActive && !quizPending && !pendingWin) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (key === 'm') {
    event.preventDefault();
    sound.setEnabled(!sound.enabled);
    ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));
    return;
  }
  if (state.status !== 'running' || paused || quizActive || quizPending || pendingWin) return;

  const step = event.shiftKey ? 38 : 22;
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
    sound.ensure();
    aim.visible = true;
    positionReticle();
    shoot(aim.x, aim.y);
  }
});

ui.startButton.addEventListener('click', startRound);
ui.restartButton.addEventListener('click', startRound);
ui.resumeButton.addEventListener('click', () => togglePause(false));
ui.pauseButton.addEventListener('click', () => togglePause());
ui.soundButton.addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));
  ui.soundButton.querySelector('b').textContent = sound.enabled ? 'Lyd' : 'Lyd av';
});
ui.fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await ui.appShell.requestFullscreen?.({ navigationUI: 'hide' });
  } catch {
    showMessage('Fullskjerm kunne ikke aktiveres i denne nettleseren.', true);
  }
});
document.addEventListener('fullscreenchange', () => {
  ui.fullscreenButton.querySelector('b').textContent = document.fullscreenElement ? 'Avslutt' : 'Fullskjerm';
  window.setTimeout(resize, 60);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running' && !paused && !quizActive && !quizPending && !pendingWin) togglePause(true);
});
window.addEventListener('resize', resize, { passive: true });
new ResizeObserver(resize).observe(board);

function debugHit(kind = 'normal', quizRoll = 1) {
  if (state.status !== 'running' || paused || quizActive || quizPending || pendingWin) return false;
  const resolvedKind = state.casesSolved === TARGET_CASES - 1 ? 'major' : kind;
  const target = spawnTarget({ x: 0, baseY: 1.8, z: -10, direction: 1, speed: 0, kind: resolvedKind, size: resolvedKind === 'major' ? 1.35 : 1 });
  target.y = target.baseY;
  const point = renderer.projectWorld([target.x, target.y, target.z]) || { x: renderer.width / 2, y: renderer.height / 2 };
  return resolveShot(target, point.x, point.y, quizRoll);
}

if (testMode) {
  window.__brukerstottejakten = {
    start: startRound,
    hit: debugHit,
    miss: () => resolveShot(null, renderer.width / 2, renderer.height / 2, 1),
    forceQuiz: () => {
      if (state.status !== 'running' || quizActive || quizPending || pendingWin) return false;
      quizPending = true;
      openQuiz();
      return true;
    },
    answerCorrect: () => currentQuestion ? answerQuiz(currentQuestion.correct) : false,
    answerWrong: () => currentQuestion ? answerQuiz(currentQuestion.correct === 0 ? 1 : 0) : false,
    pause: () => togglePause(true),
    resume: () => togglePause(false),
    getState: () => ({ ...state, paused, quizActive, quizPending, pendingWin, slowActive: performance.now() < slowUntil }),
    renderer: () => renderer.info,
    getTargets: () => targets.map((target) => ({ id: target.id, kind: target.kind, hit: target.hit, screenBounds: target.screenBounds ? { ...target.screenBounds } : null })),
  };
}

resize();
updateHud();
updateRadar();
requestAnimationFrame(gameLoop);
