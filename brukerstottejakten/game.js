import {
  FINAL_BOSS_HITS,
  FLOW_THRESHOLD,
  MISSION_CATALOG,
  ROUND_SECONDS,
  STAGES,
  TARGET_CASES,
  accuracyPercent,
  awardScore,
  clamp,
  createGameState,
  elapsedSeconds,
  experienceAward,
  finishByTimeout,
  missionCount,
  missionStatus,
  performanceRank,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  resolveShot,
  stageProgressPercent,
  startGame,
} from './game-core.js';
import {
  PERK_CATALOG,
  applySessionToProfile,
  careerForXp,
  createDefaultProfile,
  createSeededRandom,
  dailyModifier,
  dailySeed,
  dateKey,
  decodeDuel,
  encodeDuel,
  hashString32,
  resultCode,
  sanitizeName,
  selectMissionIds,
  selectPerkChoices,
  sortLeaderboard,
} from './meta-core.js';
import {
  createCuboidMesh,
  distanceToPolygon,
  easeOutCubic,
  lerp,
  pointInPolygon,
  polygonArea,
  projectPoint,
  smoothstep,
} from './scene-engine.js';
import { AudioEngine } from './audio-engine.js';

const board = document.querySelector('#gameBoard');
const canvas = document.querySelector('#gameCanvas');
const context = canvas?.getContext('2d', { alpha: false, desynchronized: true });

if (!board || !canvas || !context) throw new Error('Spillområdet kunne ikke initialiseres.');

const ui = {
  startOverlay: document.querySelector('#startOverlay'),
  perkOverlay: document.querySelector('#perkOverlay'),
  quizOverlay: document.querySelector('#quizOverlay'),
  pauseOverlay: document.querySelector('#pauseOverlay'),
  winOverlay: document.querySelector('#winOverlay'),
  startButton: document.querySelector('#startButton'),
  restartButton: document.querySelector('#restartButton'),
  resumeButton: document.querySelector('#resumeButton'),
  shareButton: document.querySelector('#shareButton'),
  copyButton: document.querySelector('#copyButton'),
  soundButton: document.querySelector('#soundButton'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  pauseButton: document.querySelector('#pauseButton'),
  dailyModeButton: document.querySelector('#dailyModeButton'),
  randomModeButton: document.querySelector('#randomModeButton'),
  duelModeButton: document.querySelector('#duelModeButton'),
  duelModeTitle: document.querySelector('#duelModeTitle'),
  duelModeDetail: document.querySelector('#duelModeDetail'),
  playerName: document.querySelector('#playerName'),
  dutyStatus: document.querySelector('#dutyStatus'),
  statusChip: document.querySelector('#statusChip'),
  clockChip: document.querySelector('#clockChip'),
  operationClock: document.querySelector('#operationClock'),
  careerChip: document.querySelector('#careerChip'),
  careerLevel: document.querySelector('#careerLevel'),
  careerTitle: document.querySelector('#careerTitle'),
  startCareerLevel: document.querySelector('#startCareerLevel'),
  startCareerTitle: document.querySelector('#startCareerTitle'),
  startCareerStats: document.querySelector('#startCareerStats'),
  startCareerXpFill: document.querySelector('#startCareerXpFill'),
  startCareerXpText: document.querySelector('#startCareerXpText'),
  dailyConsole: document.querySelector('#dailyConsole'),
  dailyDate: document.querySelector('#dailyDate'),
  dailyModifierIcon: document.querySelector('#dailyModifierIcon'),
  dailyModifierName: document.querySelector('#dailyModifierName'),
  dailyModifierDetail: document.querySelector('#dailyModifierDetail'),
  leaderboardModeLabel: document.querySelector('#leaderboardModeLabel'),
  startLeaderboard: document.querySelector('#startLeaderboard'),
  stageNumber: document.querySelector('#stageNumber'),
  stageName: document.querySelector('#stageName'),
  stageSubtitle: document.querySelector('#stageSubtitle'),
  stageMiniFill: document.querySelector('#stageMiniFill'),
  levelRail: document.querySelector('#levelRail'),
  scoreText: document.querySelector('#scoreText'),
  pointsText: document.querySelector('#pointsText'),
  comboText: document.querySelector('#comboText'),
  comboItem: document.querySelector('.combo-item'),
  missesText: document.querySelector('#missesText'),
  missionCount: document.querySelector('#missionCount'),
  missionList: document.querySelector('#missionList'),
  queueSignalText: document.querySelector('#queueSignalText'),
  queueDetail: document.querySelector('#queueDetail'),
  duelPanel: document.querySelector('#duelPanel'),
  duelName: document.querySelector('#duelName'),
  duelFill: document.querySelector('#duelFill'),
  duelMarker: document.querySelector('#duelMarker'),
  duelGap: document.querySelector('#duelGap'),
  bossPanel: document.querySelector('#bossPanel'),
  bossHealthText: document.querySelector('#bossHealthText'),
  bossHealthFill: document.querySelector('#bossHealthFill'),
  bossWeakness: document.querySelector('#bossWeakness'),
  stageBanner: document.querySelector('#stageBanner'),
  stageBannerIndex: document.querySelector('#stageBannerIndex'),
  stageBannerTitle: document.querySelector('#stageBannerTitle'),
  stageBannerSubtitle: document.querySelector('#stageBannerSubtitle'),
  powerup: document.querySelector('#powerup'),
  powerupSource: document.querySelector('#powerupSource'),
  powerupTimer: document.querySelector('#powerupTimer'),
  streakAnnouncement: document.querySelector('#streakAnnouncement'),
  message: document.querySelector('#message'),
  messageText: document.querySelector('#message span'),
  floatingScore: document.querySelector('#floatingScore'),
  crosshair: document.querySelector('#crosshair'),
  flowPercent: document.querySelector('#flowPercent'),
  flowFill: document.querySelector('#flowFill'),
  flowTrack: document.querySelector('#flowTrack'),
  flowHint: document.querySelector('#flowHint'),
  perkStrip: document.querySelector('#perkStrip'),
  perkChoiceNumber: document.querySelector('#perkChoiceNumber'),
  perkTitle: document.querySelector('#perkTitle'),
  perkOptions: document.querySelector('#perkOptions'),
  weaponHud: document.querySelector('#weaponHud'),
  weaponMode: document.querySelector('#weaponMode'),
  scorePercent: document.querySelector('#scorePercent'),
  scoreFill: document.querySelector('#scoreFill'),
  scoreTrack: document.querySelector('#scoreTrack'),
  casesRemaining: document.querySelector('#casesRemaining'),
  remainingWord: document.querySelector('#remainingWord'),
  highScoreText: document.querySelector('#highScoreText'),
  hitFlash: document.querySelector('#hitFlash'),
  quizTitle: document.querySelector('#quizTitle'),
  quizProgress: document.querySelector('#quizProgress'),
  quizRewardText: document.querySelector('#quizRewardText'),
  quizOptions: document.querySelector('#quizOptions'),
  quizFeedback: document.querySelector('#quizFeedback'),
  resultKicker: document.querySelector('#resultKicker'),
  winTitle: document.querySelector('#winTitle'),
  winSummary: document.querySelector('#winSummary'),
  rankEmblem: document.querySelector('#rankEmblem'),
  rankGrade: document.querySelector('#rankGrade'),
  rankTitle: document.querySelector('#rankTitle'),
  rankDetail: document.querySelector('#rankDetail'),
  resultCode: document.querySelector('#resultCode'),
  resultMode: document.querySelector('#resultMode'),
  resultPoints: document.querySelector('#resultPoints'),
  resultDuel: document.querySelector('#resultDuel'),
  resultCases: document.querySelector('#resultCases'),
  resultStage: document.querySelector('#resultStage'),
  resultAccuracy: document.querySelector('#resultAccuracy'),
  resultShots: document.querySelector('#resultShots'),
  resultCombo: document.querySelector('#resultCombo'),
  resultFlow: document.querySelector('#resultFlow'),
  resultQuiz: document.querySelector('#resultQuiz'),
  resultMissions: document.querySelector('#resultMissions'),
  resultEscalations: document.querySelector('#resultEscalations'),
  xpGain: document.querySelector('#xpGain'),
  careerRewardLabel: document.querySelector('#careerRewardLabel'),
  careerAfter: document.querySelector('#careerAfter'),
  careerAfterFill: document.querySelector('#careerAfterFill'),
  careerAfterText: document.querySelector('#careerAfterText'),
  badgeRow: document.querySelector('#badgeRow'),
  resultLeaderboardLabel: document.querySelector('#resultLeaderboardLabel'),
  resultLeaderboard: document.querySelector('#resultLeaderboard'),
};

const audio = new AudioEngine();
const params = new URLSearchParams(window.location.search);
const testMode = params.has('test');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touchDevice = window.matchMedia('(pointer: coarse)').matches;
const incomingDuel = decodeDuel(params.get('duell'));
const today = new Date();
const todayKey = dateKey(today);
const todaySeed = dailySeed(today);
const todayDailyModifier = dailyModifier(todaySeed);
const PROFILE_KEY = 'brukerstottejakten-v4-profile';
const LEADERBOARD_KEY = 'brukerstottejakten-v4-leaderboard';
const PERK_LEVELS = new Set([3, 6]);
const OVERTIME_SECONDS = 30;

const positiveMessages = [
  'Sak lukket uten omvei.',
  'Riktig kø. Riktig tiltak.',
  'Dokumentert, verifisert og lukket.',
  'SLA reddet med god margin.',
  'Service Manager registrerer kvalitet.',
  'Købildet ble merkbart penere.',
  'Den saken får ikke bli med til neste møte.',
  'Null restanse er nærmere.',
];

const noarkQuestions = [
  { question: 'Hva er Noark 5?', options: ['En standard for elektronisk arkivdanning', 'Et program for videomøter'], correct: 0, fact: 'Noark 5 beskriver krav til arkivstruktur, metadata og funksjonalitet for elektronisk arkivdanning.' },
  { question: 'Skal metadata gjøre dokumentasjon enklere å finne og forstå?', options: ['Ja', 'Nei'], correct: 0, fact: 'Metadata bevarer sammenheng og gjør dokumentasjon søkbar og forståelig over tid.' },
  { question: 'Kan et fagsystem integreres med en Noark 5-kjerne?', options: ['Ja', 'Nei'], correct: 0, fact: 'En Noark 5-kjerne kan motta og forvalte arkivinformasjon fra ett eller flere fagsystemer.' },
  { question: 'Er en journalpost og et dokument alltid det samme?', options: ['Nei', 'Ja'], correct: 0, fact: 'En journalpost er en registrering og kan være knyttet til både hoveddokument og vedlegg.' },
  { question: 'Kan skjerming styres ved hjelp av registrerte opplysninger?', options: ['Ja', 'Nei'], correct: 0, fact: 'Tilgangskoder, autorisasjon og skjermingsmetadata kan bidra til å styre hva brukere får se.' },
  { question: 'Betyr bevaring og kassasjon det samme?', options: ['Nei', 'Ja'], correct: 0, fact: 'Bevaring betyr at materialet skal tas vare på. Kassasjon betyr at det kan destrueres etter gjeldende regler.' },
  { question: 'Beskriver Noark 5 både arkivstruktur og metadata?', options: ['Ja', 'Nei'], correct: 0, fact: 'Standarden omfatter blant annet struktur, metadata og funksjonelle krav.' },
  { question: 'Er bare selve filen nok til å bevare dokumentasjonens sammenheng?', options: ['Nei', 'Ja'], correct: 0, fact: 'Dokumentasjon trenger metadata og kontekst for å kunne forstås og forvaltes over tid.' },
  { question: 'Kan flere dokumenter høre til samme registrering?', options: ['Ja', 'Nei'], correct: 0, fact: 'En registrering kan blant annet ha et hoveddokument og ett eller flere vedlegg.' },
  { question: 'Er sporbarhet viktig i elektronisk arkivdanning?', options: ['Ja', 'Nei'], correct: 0, fact: 'Sporbarhet bidrar til tillit, etterprøvbarhet og kontroll med dokumentasjonen.' },
  { question: 'Har kontekst betydning når dokumentasjon skal forstås senere?', options: ['Ja', 'Nei'], correct: 0, fact: 'Kontekst og metadata gjør det mulig å forstå hvorfor dokumentasjonen ble skapt og hvordan den hører sammen.' },
  { question: 'Kan arkivmetadata støtte gjenfinning over tid?', options: ['Ja', 'Nei'], correct: 0, fact: 'Strukturerte metadata gjør informasjonen lettere å finne, tolke og kontrollere.' },
];

const targetProfiles = {
  normal: {
    label: 'ÅPEN', short: 'ORDINÆR', size: { x: 1.78, y: 0.78, z: 0.56 }, speed: 2.1,
    colors: { light: '#ffab69', front: '#e56f3f', dark: '#7d3028', edge: '#ffe4b5', stripe: '#ffd66b', ink: '#171f22' },
  },
  priority: {
    label: 'HASTER', short: 'PRIORITET', size: { x: 1.68, y: 0.74, z: 0.54 }, speed: 2.72,
    colors: { light: '#ff8b7e', front: '#c94e52', dark: '#611e31', edge: '#ffd9cf', stripe: '#fff0ad', ink: '#25181c' },
  },
  legacy: {
    label: 'ELDRE SAK', short: 'ETTERSLEP', size: { x: 1.92, y: 0.82, z: 0.62 }, speed: 1.78,
    colors: { light: '#6fe0c7', front: '#328f86', dark: '#154d50', edge: '#d2fff2', stripe: '#ffe27e', ink: '#102326' },
  },
  sla: {
    label: 'SLA-VINDU', short: 'BONUS', size: { x: 1.54, y: 0.68, z: 0.48 }, speed: 3.05,
    colors: { light: '#fff3a5', front: '#d9a92f', dark: '#785014', edge: '#fff8d3', stripe: '#8fffe1', ink: '#211b0d' },
  },
  critical: {
    label: 'HOVEDHENDELSE', short: 'KRITISK', size: { x: 2.72, y: 1.12, z: 0.88 }, speed: 1.18,
    colors: { light: '#f6c868', front: '#6e3540', dark: '#241b2a', edge: '#fff0b2', stripe: '#ffcf54', ink: '#17131b' },
  },
};

const stageThemes = [
  { accent: '#69f2ce', skyTop: '#17495f', skyMid: '#5a9a9a', horizon: '#f0c987', haze: '#f7dcaa', mountainFar: '#608c84', mountainNear: '#3c6965', groundTop: '#365f51', groundBottom: '#082029', skyline: '#26535a' },
  { accent: '#74e8d2', skyTop: '#176072', skyMid: '#66aaa3', horizon: '#dec289', haze: '#f0d7a1', mountainFar: '#518379', mountainNear: '#32635d', groundTop: '#315b4c', groundBottom: '#072029', skyline: '#215158' },
  { accent: '#83e0ff', skyTop: '#17536d', skyMid: '#5795a2', horizon: '#c8b88f', haze: '#e2d5af', mountainFar: '#4d747c', mountainNear: '#31545f', groundTop: '#2b514a', groundBottom: '#071d28', skyline: '#1f4854' },
  { accent: '#ffd76e', skyTop: '#6c4c68', skyMid: '#bc746b', horizon: '#f0bd72', haze: '#ffd69b', mountainFar: '#795c68', mountainNear: '#4d4557', groundTop: '#3c4f43', groundBottom: '#0b1d27', skyline: '#3b3c4e' },
  { accent: '#ff9d73', skyTop: '#313b5c', skyMid: '#79586d', horizon: '#c28576', haze: '#d6a487', mountainFar: '#4d5266', mountainNear: '#303a4c', groundTop: '#2c413e', groundBottom: '#071722', skyline: '#252f43' },
  { accent: '#8fc5ff', skyTop: '#172d43', skyMid: '#435d6b', horizon: '#918e82', haze: '#bdb39b', mountainFar: '#3d5661', mountainNear: '#263e49', groundTop: '#233f3f', groundBottom: '#06171f', skyline: '#172f3c' },
  { accent: '#b28cff', skyTop: '#121d3d', skyMid: '#3c4268', horizon: '#6c7087', haze: '#9394a2', mountainFar: '#303e5b', mountainNear: '#202d47', groundTop: '#20363d', groundBottom: '#040f1b', skyline: '#13273a' },
  { accent: '#ffd66b', skyTop: '#07142d', skyMid: '#1f3853', horizon: '#526879', haze: '#879494', mountainFar: '#293e55', mountainNear: '#162c3e', groundTop: '#182f35', groundBottom: '#030e18', skyline: '#0e2432' },
];

const confettiColors = ['#ffd66b', '#69f2ce', '#f47a43', '#f8f2d8', '#77b9ff', '#ef83b5', '#b28cff'];

let state = createGameState();
let profile = readProfile();
let leaderboard = readLeaderboard();
let selectedMode = incomingDuel ? 'duel' : 'daily';
let randomPreviewSeed = randomSeed();
let runMode = selectedMode;
let runSeed = todaySeed;
let runModifier = todayDailyModifier;
let rng = createSeededRandom(runSeed);
let selectedMissionIds = [];
let rewardedMissions = new Set();
let missionSnapshot = {};
let ownedPerks = [];
let perkState = createPerkState();
let perkChoiceIndex = 0;
let perkPending = false;
let perkFreezeStartedAt = 0;
let deferredQuiz = false;
let resultFinalized = false;
let resultEntry = null;
let resultChallengeUrl = '';
let roundEndsAt = 0;
let pauseStartedAt = 0;
let overtimeAnnounced = false;
let lastClockSecond = -1;
let targets = [];
let particles = [];
let shockwaves = [];
let tracerLines = [];
let confetti = [];
let clouds = [];
let stars = [];
let rain = [];
let dust = [];
let skylineSeeds = [];
let mountainSeeds = [];
let targetId = 1;
let spawnClock = 0;
let lastFrame = performance.now();
let animationTime = 0;
let stageVisual = 1;
let messageTimer = 0;
let quizTimer = 0;
let winTimer = 0;
let stageTimer = 0;
let streakTimer = 0;
let flowUntil = 0;
let flowSource = 'Saksflyt aktiv';
let hitStopUntil = 0;
let finalTargetAt = 0;
let finalTargetSpawned = false;
let paused = false;
let quizActive = false;
let quizPending = false;
let currentQuestion = null;
let questionDeck = [];
let previousQuestion = null;
let recoil = 0;
let cameraShake = 0;
let lightning = 0;
let soundEnabled = true;

const world = { width: 1, height: 1, dpr: 1, horizon: 1, focal: 1 };
const camera = { x: 0, y: 2.18, z: 0, focal: 1, near: 0.25 };
const aim = { x: 0, y: 0, visible: false, pointerType: 'keyboard', hideAt: 0, lockTargetId: null };

function createPerkState() {
  return {
    hitboxScale: 1,
    flowMultiplier: 1,
    flowDurationBonus: 0,
    priorityMultiplier: 1,
    quizReward: 300,
    shields: 0,
    comboGuards: 0,
    automationEvery: 0,
    bossSpeed: 1,
    perfectMultiplier: 1,
  };
}

function randomBetween(min, max) {
  return min + rng() * (max - min);
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function randomSeed() {
  try {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] >>> 0;
  } catch {
    return hashString32(`${Date.now()}:${Math.random()}`);
  }
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((character) => character + character).join('') : value;
  const number = Number.parseInt(normalized, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
}

function rgbToCss(color, alpha = 1) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

function mixColor(fromHex, toHex, amount) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  return rgbToCss({ r: lerp(from.r, to.r, amount), g: lerp(from.g, to.g, amount), b: lerp(from.b, to.b, amount) });
}

function shadeColor(hex, amount) {
  const color = hexToRgb(hex);
  const target = amount >= 1 ? 255 : 0;
  const strength = amount >= 1 ? Math.min(1, amount - 1) : Math.min(1, 1 - amount);
  return rgbToCss({ r: lerp(color.r, target, strength), g: lerp(color.g, target, strength), b: lerp(color.b, target, strength) });
}

function formatClock(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = String(Math.floor(whole / 60)).padStart(2, '0');
  const remainder = String(whole % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatScore(score) {
  return new Intl.NumberFormat('nb-NO').format(Math.max(0, Math.round(score || 0)));
}

function readProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...createDefaultProfile(), ...saved } : createDefaultProfile();
  } catch {
    return createDefaultProfile();
  }
}

function writeProfile() {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Local storage is optional.
  }
}

function readLeaderboard() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((entry) => Number.isFinite(entry?.score)).slice(0, 80) : [];
  } catch {
    return [];
  }
}

function writeLeaderboard() {
  try {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard.slice(0, 80)));
  } catch {
    // Local storage is optional.
  }
}

function careerSummary() {
  return careerForXp(profile.xp || 0);
}

function modeLabel(mode = runMode) {
  if (mode === 'duel') return 'Kollegaduell';
  if (mode === 'daily') return 'Dagens kø';
  return 'Tilfeldig vakt';
}

function leaderboardEntriesFor(mode = selectedMode, seed = mode === 'daily' ? todaySeed : runSeed) {
  const filtered = leaderboard.filter((entry) => {
    if (mode === 'daily') return entry.mode === 'daily' && entry.dateKey === todayKey;
    if (mode === 'duel') return entry.seed === seed;
    return entry.mode === 'random';
  });
  return sortLeaderboard(filtered, 5);
}

function renderLeaderboard(list, entries) {
  list.replaceChildren();
  if (!entries.length) {
    const item = document.createElement('li');
    item.innerHTML = '<i>--</i><span><b>Ingen resultater ennå</b><small>Spill den første vakten</small></span><strong>—</strong>';
    list.append(item);
    return;
  }
  entries.forEach((entry, index) => {
    const item = document.createElement('li');
    const name = entry.name || 'Anonym';
    item.innerHTML = `<i>${String(index + 1).padStart(2, '0')}</i><span><b>${escapeHtml(name)}</b><small>${entry.grade} · ${entry.cases}/${TARGET_CASES}</small></span><strong>${formatScore(entry.score)}</strong>`;
    list.append(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function runConfigForMode(mode) {
  if (mode === 'duel' && incomingDuel) {
    return { mode, seed: incomingDuel.seed, modifier: dailyModifier(incomingDuel.seed), duel: incomingDuel };
  }
  if (mode === 'daily') return { mode, seed: todaySeed, modifier: todayDailyModifier, duel: null };
  const seed = randomPreviewSeed;
  return { mode: 'random', seed, modifier: dailyModifier(seed), duel: null };
}

function selectMode(mode) {
  if (mode === 'duel' && !incomingDuel) mode = 'daily';
  selectedMode = mode;
  for (const button of [ui.dailyModeButton, ui.randomModeButton, ui.duelModeButton]) {
    if (!button) continue;
    const selected = button.dataset.mode === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', String(selected));
  }
  const preview = runConfigForMode(mode);
  ui.dailyConsole.hidden = mode === 'random';
  ui.dailyModifierName.textContent = preview.modifier.name;
  ui.dailyModifierDetail.textContent = preview.modifier.detail;
  ui.dailyModifierIcon.textContent = preview.modifier.id.slice(0, 2).toUpperCase();
  ui.leaderboardModeLabel.textContent = modeLabel(mode);
  renderLeaderboard(ui.startLeaderboard, leaderboardEntriesFor(mode, preview.seed));
}

function updateCareerUi() {
  const career = careerSummary();
  ui.careerLevel.textContent = String(career.level);
  ui.careerTitle.textContent = career.title;
  ui.startCareerLevel.textContent = String(career.level);
  ui.startCareerTitle.textContent = career.title;
  ui.startCareerStats.textContent = `${profile.plays || 0} vakter · ${profile.wins || 0} seiere · ${profile.streak || 0} dagers rekke`;
  ui.startCareerXpFill.style.width = `${career.progress}%`;
  ui.startCareerXpText.textContent = career.next ? `${formatScore(career.xpToNext)} XP til ${career.next.title}` : 'Maksnivå nådd';
  ui.playerName.value = profile.name || '';
}

function configureStartScreen() {
  ui.dailyDate.textContent = today.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' }).replace('.', '');
  ui.dailyModifierName.textContent = todayDailyModifier.name;
  ui.dailyModifierDetail.textContent = todayDailyModifier.detail;
  ui.dailyModifierIcon.textContent = todayDailyModifier.id.slice(0, 2).toUpperCase();
  if (incomingDuel) {
    ui.duelModeButton.hidden = false;
    ui.duelModeTitle.textContent = incomingDuel.name ? `Duell mot ${incomingDuel.name}` : 'Kollegaduell';
    ui.duelModeDetail.textContent = `Slå ${formatScore(incomingDuel.score)} poeng · ${incomingDuel.code || incomingDuel.grade}`;
  }
  updateCareerUi();
  selectMode(selectedMode);
}

function createSceneSeeds(seed = runSeed) {
  const seeded = createSeededRandom((Number(seed) >>> 0) ^ 0x51ED270B);
  clouds = Array.from({ length: 10 }, (_, index) => ({ x: seeded(), y: 0.07 + seeded() * 0.3, scale: 0.42 + seeded() * 0.9, speed: 0.0035 + seeded() * 0.009, layer: index % 3, opacity: 0.26 + seeded() * 0.46 }));
  stars = Array.from({ length: 140 }, () => ({ x: seeded(), y: seeded() * 0.6, size: 0.45 + seeded() * 1.55, phase: seeded() * Math.PI * 2 }));
  rain = Array.from({ length: 112 }, () => ({ x: seeded(), y: seeded(), length: 8 + seeded() * 19, speed: 0.34 + seeded() * 0.62 }));
  dust = Array.from({ length: 65 }, () => ({ x: seeded(), y: seeded(), size: 0.65 + seeded() * 1.9, phase: seeded() * Math.PI * 2, speed: 0.18 + seeded() * 0.74 }));
  skylineSeeds = Array.from({ length: 90 }, () => ({ height: 0.42 + seeded() * 0.58, width: 0.62 + seeded() * 0.65, lights: 2 + Math.floor(seeded() * 6) }));
  mountainSeeds = Array.from({ length: 110 }, () => ({ a: seeded(), b: seeded() }));
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const mobileScale = touchDevice ? 1.45 : 1.8;
  const dpr = Math.min(window.devicePixelRatio || 1, mobileScale);
  world.width = Math.max(1, rect.width);
  world.height = Math.max(1, rect.height);
  world.dpr = dpr;
  world.horizon = world.height * (world.width < 600 ? 0.56 : 0.54);
  world.focal = Math.max(520, world.height * (world.width < 600 ? 1.08 : 1.18));
  camera.focal = world.focal;
  canvas.width = Math.round(world.width * dpr);
  canvas.height = Math.round(world.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (!aim.x && !aim.y) {
    aim.x = world.width / 2;
    aim.y = world.height * 0.42;
  } else {
    aim.x = clamp(aim.x, 0, world.width);
    aim.y = clamp(aim.y, 0, world.height);
  }
  for (const target of targets) target.mesh = null;
  positionCrosshair();
  updateWeaponPose();
}

function currentStage() {
  return STAGES[state.stage - 1] || STAGES[0];
}

function queueSignalForStage(stage) {
  const labels = [
    ['Stabilt', '2 samtidige mål'],
    ['Belastet', 'Prioritetssaker aktive'],
    ['Urolig', 'Integrasjoner endrer banene'],
    ['Tidskritisk', 'SLA-vinduer aktive'],
    ['Høyt trykk', '4 samtidige mål'],
    ['Kritisk', 'Presisjon under belastning'],
    ['Regionalt', '5 samtidige mål'],
    ['Hovedhendelse', 'Fem delhendelser gjenstår'],
  ];
  const [label, detail] = labels[clamp(stage, 1, labels.length) - 1];
  return { label, detail };
}

function renderLevelRail() {
  ui.levelRail.replaceChildren();
  for (const stage of STAGES) {
    const item = document.createElement('span');
    item.dataset.stage = String(stage.id);
    item.innerHTML = `<i>${String(stage.id).padStart(2, '0')}</i><b>${stage.name}</b>`;
    ui.levelRail.append(item);
  }
}

function renderMissionList() {
  ui.missionList.replaceChildren();
  selectedMissionIds.forEach((id, index) => {
    const mission = MISSION_CATALOG[id];
    const item = document.createElement('li');
    item.dataset.mission = id;
    item.innerHTML = `<i aria-hidden="true">${String(index + 1).padStart(2, '0')}</i><span><b>${mission.label}</b><small>${mission.detail}</small><span class="mission-progress"><em></em></span></span><strong>+${mission.reward}</strong>`;
    ui.missionList.append(item);
  });
}

function rewardNewMissions() {
  const newlyCompleted = [];
  for (const id of selectedMissionIds) {
    const status = missionStatus(state, id);
    if (status?.complete && !rewardedMissions.has(id)) {
      rewardedMissions.add(id);
      state = awardScore(state, status.reward, 'mission');
      newlyCompleted.push(status);
    }
  }
  if (newlyCompleted.length) {
    const reward = newlyCompleted.reduce((sum, item) => sum + item.reward, 0);
    showMessage(`Vaktmål fullført: ${newlyCompleted.map((item) => item.label).join(' · ')}`);
    showFloatingScore(`+${formatScore(reward)} MÅLBONUS`, world.width * 0.5, world.height * 0.32);
    audio.mission();
    vibrate([18, 24, 26]);
  }
}

function updateMissionUi({ reward = false } = {}) {
  if (reward) rewardNewMissions();
  let completeCount = 0;
  for (const item of ui.missionList.querySelectorAll('[data-mission]')) {
    const status = missionStatus(state, item.dataset.mission);
    if (!status) continue;
    item.classList.toggle('is-complete', status.complete);
    const progress = item.querySelector('.mission-progress em');
    if (progress) progress.style.width = `${status.percent}%`;
    const rewardElement = item.querySelector(':scope > strong');
    if (rewardElement) rewardElement.textContent = status.complete ? 'FULLFØRT' : `${Math.round(status.current)}/${status.target}`;
    if (status.complete) completeCount += 1;
  }
  ui.missionCount.textContent = `${completeCount}/${selectedMissionIds.length || 3}`;
}

function updateDuelHud() {
  const duel = runMode === 'duel' ? incomingDuel : null;
  ui.duelPanel.hidden = !duel;
  if (!duel) return;
  const percent = clamp((state.score / Math.max(1, duel.score)) * 100, 0, 120);
  ui.duelName.textContent = duel.name ? `Slå ${duel.name}` : 'Slå kollegaen';
  ui.duelFill.style.width = `${Math.min(100, percent)}%`;
  ui.duelMarker.style.left = '100%';
  const gap = state.score - duel.score;
  ui.duelGap.textContent = gap >= 0 ? `Du leder med ${formatScore(gap)} poeng` : `${formatScore(Math.abs(gap))} poeng gjenstår`;
  ui.duelPanel.classList.toggle('is-ahead', gap >= 0);
}

function updateBossHud() {
  const boss = targets.find((target) => target.kind === 'critical' && !target.hit);
  const active = state.stage === STAGES.length && Boolean(boss);
  ui.bossPanel.hidden = !active;
  if (!active) return;
  const health = Math.max(0, boss.health ?? FINAL_BOSS_HITS);
  const maxHealth = boss.maxHealth ?? FINAL_BOSS_HITS;
  ui.bossHealthText.textContent = `${health}/${maxHealth}`;
  ui.bossHealthFill.style.width = `${(health / maxHealth) * 100}%`;
  ui.bossWeakness.textContent = health === 1 ? 'Én delhendelse gjenstår' : `Lukk ${health} delhendelser`;
}

function updateHud({ rewardMissions = false } = {}) {
  const stage = currentStage();
  const progress = Math.round(progressPercent(state.casesSolved));
  const stageProgress = Math.round(stageProgressPercent(state.casesSolved, state.stage));
  const remaining = TARGET_CASES - state.casesSolved;
  const online = state.status === 'running' && !paused && !quizActive && !perkPending;
  const signal = queueSignalForStage(state.stage);
  const career = careerSummary();

  ui.stageNumber.textContent = String(stage.id).padStart(2, '0');
  ui.stageName.textContent = stage.name;
  ui.stageSubtitle.textContent = stage.subtitle;
  ui.stageMiniFill.style.width = `${stageProgress}%`;
  ui.scoreText.innerHTML = `${state.casesSolved}<span>/${TARGET_CASES}</span>`;
  ui.pointsText.textContent = formatScore(state.score);
  ui.comboText.textContent = `x${state.streak}`;
  ui.missesText.textContent = String(state.escalations);
  ui.scorePercent.textContent = `${progress} %`;
  ui.scoreFill.style.width = `${progress}%`;
  ui.scoreTrack.setAttribute('aria-valuenow', String(state.casesSolved));
  ui.casesRemaining.textContent = String(remaining);
  ui.remainingWord.textContent = remaining === 1 ? 'sak' : 'saker';
  ui.flowPercent.textContent = `${Math.round(state.flow)} %`;
  ui.flowFill.style.width = `${state.flow}%`;
  ui.flowTrack.setAttribute('aria-valuenow', String(Math.round(state.flow)));
  ui.flowHint.textContent = state.streak >= 2 ? `${Math.max(0, FLOW_THRESHOLD - Math.round(state.flow))} % til Saksflyt` : 'Treff saker på rad for å aktivere flyt';
  ui.queueSignalText.textContent = signal.label;
  ui.queueDetail.textContent = signal.detail;
  ui.careerLevel.textContent = String(career.level);
  ui.careerTitle.textContent = career.title;

  const localBest = leaderboardEntriesFor(runMode, runSeed)[0];
  ui.highScoreText.textContent = localBest ? `Rekord: ${formatScore(localBest.score)}` : 'Rekord: —';

  let duty = 'frakoblet';
  if (state.status === 'won') duty = 'fullført';
  else if (state.status === 'timeout') duty = 'tiden ute';
  else if (paused) duty = 'pause';
  else if (perkPending) duty = 'strategivalg';
  else if (quizActive) duty = 'fagtest';
  else if (state.status === 'running') duty = 'pålogget';
  ui.dutyStatus.textContent = duty;
  ui.statusChip.classList.toggle('is-online', online);
  ui.statusChip.classList.toggle('is-paused', paused || quizActive || perkPending);
  ui.pauseButton.disabled = state.status !== 'running' || quizActive || perkPending;
  ui.pauseButton.setAttribute('aria-pressed', String(paused));
  ui.pauseButton.querySelector('span').textContent = paused ? 'Fortsett' : 'Pause';
  ui.pauseButton.querySelector('i').textContent = paused ? '▶' : 'Ⅱ';

  ui.levelRail.querySelectorAll('[data-stage]').forEach((item) => {
    const level = Number(item.dataset.stage);
    item.classList.toggle('is-current', level === state.stage);
    item.classList.toggle('is-complete', level < state.stage || state.status === 'won');
  });

  updateMissionUi({ reward: rewardMissions });
  updateDuelHud();
  updateBossHud();
  ui.weaponMode.textContent = state.stage === STAGES.length ? 'SM // HOVEDHENDELSE' : state.stage >= 6 ? 'SM // KRITISK DRIFT' : state.stage >= 4 ? 'SM // PRIORITET' : 'SM // SAK LUKK';
  board.classList.toggle('is-critical', state.stage >= 6);
  board.dataset.stage = String(state.stage);
}

function roundRemainingSeconds(now = Date.now()) {
  if (!roundEndsAt) return ROUND_SECONDS;
  let reference = now;
  if (paused && pauseStartedAt) reference = pauseStartedAt;
  else if (perkPending && perkFreezeStartedAt) reference = perkFreezeStartedAt;
  return Math.max(0, (roundEndsAt - reference) / 1000);
}

function updateClock(now = Date.now()) {
  if (state.status !== 'running') return;
  const remaining = roundRemainingSeconds(now);
  const whole = Math.ceil(remaining);
  if (whole !== lastClockSecond) {
    lastClockSecond = whole;
    ui.operationClock.textContent = formatClock(remaining);
    ui.clockChip.classList.toggle('is-urgent', remaining <= OVERTIME_SECONDS);
    if (remaining <= OVERTIME_SECONDS && !overtimeAnnounced) {
      overtimeAnnounced = true;
      showStageBanner(state.stage, 'SLUTTSPURT', '1,5× poeng de siste 30 sekundene');
      audio.overtime?.();
      board.classList.add('is-overtime');
    }
  }
  if (remaining <= 0 && !resultFinalized) {
    state = finishByTimeout(state, now);
    finishRound();
  }
}

function showMessage(text, bad = false, duration = 930) {
  window.clearTimeout(messageTimer);
  ui.messageText.textContent = text;
  ui.message.classList.toggle('is-bad', bad);
  ui.message.classList.add('is-visible');
  messageTimer = window.setTimeout(() => ui.message.classList.remove('is-visible'), duration);
}

function showFloatingScore(text, x = aim.x, y = aim.y) {
  ui.floatingScore.textContent = text;
  ui.floatingScore.style.left = `${clamp(x, 55, world.width - 55)}px`;
  ui.floatingScore.style.top = `${clamp(y, 110, world.height - 100)}px`;
  ui.floatingScore.classList.remove('pop');
  void ui.floatingScore.offsetWidth;
  ui.floatingScore.classList.add('pop');
}

function showStreakAnnouncement(streak, label = 'TREFFREKKE') {
  window.clearTimeout(streakTimer);
  ui.streakAnnouncement.querySelector('span').textContent = label;
  ui.streakAnnouncement.querySelector('b').textContent = `x${streak}`;
  ui.streakAnnouncement.classList.remove('is-visible');
  void ui.streakAnnouncement.offsetWidth;
  ui.streakAnnouncement.classList.add('is-visible');
  streakTimer = window.setTimeout(() => ui.streakAnnouncement.classList.remove('is-visible'), 1050);
}

function hideOverlay(overlay) {
  if (!overlay || overlay.hidden) return;
  overlay.classList.remove('is-visible');
  window.setTimeout(() => {
    if (!overlay.classList.contains('is-visible')) overlay.hidden = true;
  }, 210);
}

function showOverlay(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}

function showStageBanner(stageId, customTitle = '', customSubtitle = '') {
  const stage = STAGES[stageId - 1];
  if (!stage) return;
  window.clearTimeout(stageTimer);
  ui.stageBannerIndex.textContent = `NIVÅ ${String(stage.id).padStart(2, '0')} // ${String(STAGES.length).padStart(2, '0')}`;
  ui.stageBannerTitle.textContent = customTitle || stage.name;
  ui.stageBannerSubtitle.textContent = customSubtitle || stage.subtitle;
  ui.stageBanner.classList.remove('is-visible');
  void ui.stageBanner.offsetWidth;
  ui.stageBanner.classList.add('is-visible');
  stageTimer = window.setTimeout(() => ui.stageBanner.classList.remove('is-visible'), customTitle ? 2100 : 1850);
}

function activateFlow(duration, source) {
  const now = performance.now();
  flowUntil = Math.min(now + 9500, Math.max(flowUntil, now) + duration + perkState.flowDurationBonus);
  flowSource = source;
  ui.powerupSource.textContent = source;
  ui.powerup.classList.add('is-active');
  board.classList.add('is-flowing');
  audio.flow();
  vibrate([16, 30, 22]);
}

function updateFlowPower(now) {
  const active = now < flowUntil;
  ui.powerup.classList.toggle('is-active', active);
  board.classList.toggle('is-flowing', active);
  if (active) {
    ui.powerupTimer.textContent = `${((flowUntil - now) / 1000).toFixed(1).replace('.', ',')} s`;
    ui.powerupSource.textContent = flowSource;
  } else {
    ui.powerupTimer.textContent = '4,0 s';
  }
}

function vibrate(pattern) {
  const activation = navigator.userActivation;
  if (activation && !activation.hasBeenActive) return;
  if (typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* Haptics are optional. */ }
}

function triggerHitFlash(x, y) {
  ui.hitFlash.style.setProperty('--flash-x', `${(x / world.width) * 100}%`);
  ui.hitFlash.style.setProperty('--flash-y', `${(y / world.height) * 100}%`);
  ui.hitFlash.classList.remove('is-active');
  void ui.hitFlash.offsetWidth;
  ui.hitFlash.classList.add('is-active');
}

function triggerRecoil(strength = 1) {
  recoil = Math.min(1.7, recoil + strength);
  cameraShake = Math.min(1.5, cameraShake + strength * 0.75);
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
  }, 210);
}

function updateWeaponPose() {
  const normalizedX = clamp(aim.x / Math.max(1, world.width) * 2 - 1, -1, 1);
  const normalizedY = clamp(aim.y / Math.max(1, world.height) * 2 - 1, -1, 1);
  board.style.setProperty('--weapon-x', normalizedX.toFixed(3));
  board.style.setProperty('--weapon-y', normalizedY.toFixed(3));
}

function setAim(x, y, pointerType = 'mouse') {
  aim.x = clamp(x, 0, world.width);
  aim.y = clamp(y, 0, world.height);
  aim.visible = true;
  aim.pointerType = pointerType;
  aim.hideAt = pointerType === 'touch' ? performance.now() + 520 : 0;
  updateWeaponPose();
  updateAimLock();
  positionCrosshair();
}

function positionCrosshair() {
  ui.crosshair.style.left = `${aim.x}px`;
  ui.crosshair.style.top = `${aim.y}px`;
  const active = state.status === 'running' && !paused && !quizActive && !perkPending;
  ui.crosshair.classList.toggle('is-visible', aim.visible && active);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * world.width,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * world.height,
  };
}

function applyPerk(perkId) {
  if (ownedPerks.includes(perkId)) return;
  ownedPerks.push(perkId);
  switch (perkId) {
    case 'search': perkState.hitboxScale *= 1.24; break;
    case 'coffee': perkState.flowMultiplier *= 1.35; perkState.flowDurationBonus += 1300; break;
    case 'priority': perkState.priorityMultiplier *= 1.4; break;
    case 'knowledge': perkState.quizReward = Math.max(perkState.quizReward, 520); break;
    case 'shield': perkState.shields += 3; break;
    case 'buffer': perkState.comboGuards += 2; break;
    case 'automation': perkState.automationEvery = 5; break;
    case 'stabilizer': perkState.bossSpeed *= 0.72; perkState.hitboxScale *= 1.08; break;
    default: break;
  }
  renderPerkStrip();
}

function renderPerkStrip() {
  ui.perkStrip.replaceChildren();
  if (!ownedPerks.length) {
    const empty = document.createElement('span');
    empty.className = 'perk-empty';
    empty.textContent = 'Forbedringer låses opp på nivå 3 og 6';
    ui.perkStrip.append(empty);
    return;
  }
  for (const id of ownedPerks) {
    const perk = PERK_CATALOG[id];
    const item = document.createElement('span');
    item.className = 'perk-token';
    item.title = `${perk.name}: ${perk.detail}`;
    item.innerHTML = `<b>${perk.icon}</b><i>${perk.name}</i>`;
    ui.perkStrip.append(item);
  }
}


function createTicketTexture(target, closed = false) {
  const texture = document.createElement('canvas');
  texture.width = 720;
  texture.height = 310;
  const ctx = texture.getContext('2d');
  const profile = targetProfiles[target.kind];
  const colors = profile.colors;
  const radius = 28;

  const path = () => {
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(texture.width - radius, 0);
    ctx.quadraticCurveTo(texture.width, 0, texture.width, radius);
    ctx.lineTo(texture.width, texture.height - radius);
    ctx.quadraticCurveTo(texture.width, texture.height, texture.width - radius, texture.height);
    ctx.lineTo(radius, texture.height);
    ctx.quadraticCurveTo(0, texture.height, 0, texture.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
  };

  path();
  const base = ctx.createLinearGradient(0, 0, 0, texture.height);
  base.addColorStop(0, colors.light);
  base.addColorStop(0.16, colors.front);
  base.addColorStop(0.76, colors.front);
  base.addColorStop(1, colors.dark);
  ctx.fillStyle = base;
  ctx.fill();

  ctx.save();
  path();
  ctx.clip();
  const reflection = ctx.createLinearGradient(0, 0, texture.width, texture.height);
  reflection.addColorStop(0, 'rgba(255,255,255,.34)');
  reflection.addColorStop(0.2, 'rgba(255,255,255,0)');
  reflection.addColorStop(0.66, 'rgba(255,255,255,.06)');
  reflection.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, texture.width, texture.height);

  ctx.fillStyle = colors.stripe;
  ctx.fillRect(0, 55, texture.width, 43);
  ctx.fillStyle = 'rgba(7,20,25,.19)';
  ctx.fillRect(0, 93, texture.width, 5);

  ctx.fillStyle = 'rgba(5,18,24,.88)';
  ctx.fillRect(42, 126, texture.width - 84, 118);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(42, 126, texture.width - 84, 4);
  ctx.fillStyle = 'rgba(105,242,206,.08)';
  for (let y = 136; y < 240; y += 11) ctx.fillRect(42, y, texture.width - 84, 1);

  ctx.fillStyle = colors.ink;
  ctx.font = '900 22px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`SM-${target.ticket}`, 44, 77);
  ctx.textAlign = 'right';
  ctx.fillText(profile.short, texture.width - 44, 77);

  ctx.fillStyle = colors.edge;
  ctx.textAlign = 'center';
  ctx.font = target.kind === 'critical'
    ? '950 47px ui-monospace, SFMono-Regular, Consolas, monospace'
    : '950 43px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(target.kind === 'critical' ? 'HOVEDHENDELSE' : 'BRUKERSTØTTESAK', texture.width / 2, 171, texture.width - 120);

  ctx.fillStyle = 'rgba(219,255,244,.68)';
  ctx.font = '750 17px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('EIER  //  SERVICEDESK', 63, 216);
  ctx.textAlign = 'right';
  ctx.fillText(target.kind === 'critical' && !closed ? `DELHENDELSER  //  ${Math.max(0, target.health)}/${target.maxHealth}` : `STATUS  //  ${closed ? 'LUKKET' : profile.label}`, texture.width - 63, 216);

  ctx.fillStyle = 'rgba(5,18,24,.52)';
  ctx.fillRect(42, 263, texture.width - 84, 2);
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  for (let index = 0; index < 15; index += 1) {
    const barWidth = index % 3 === 0 ? 24 : index % 2 === 0 ? 12 : 6;
    ctx.fillRect(53 + index * 37, 277, barWidth, 9);
  }

  if (closed) {
    ctx.save();
    ctx.translate(texture.width * 0.52, texture.height * 0.54);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#f6ffe2';
    ctx.lineWidth = 9;
    ctx.strokeRect(-174, -66, 348, 132);
    ctx.fillStyle = 'rgba(5,20,24,.76)';
    ctx.fillRect(-166, -58, 332, 116);
    ctx.fillStyle = '#f6ffe2';
    ctx.font = '950 59px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LUKKET', 0, 1);
    ctx.restore();
  }

  for (const [x, y] of [[22, 22], [texture.width - 22, 22], [22, texture.height - 22], [texture.width - 22, texture.height - 22]]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,248,218,.72)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 7;
  path();
  ctx.stroke();
  return texture;
}

function targetSpawnLimits(z) {
  const horizontal = (world.width * 0.5 * z) / world.focal;
  return horizontal + 2.8;
}

function chooseTargetKind() {
  const stage = state.stage;
  const roll = rng();
  const priorityBias = runModifier.priorityBias || 0;
  const legacyBias = runModifier.legacyBias || 0;
  const slaChance = stage >= 4 ? (stage >= 6 ? 0.15 : 0.1) : 0;
  const priorityChance = clamp([0.04, 0.14, 0.18, 0.22, 0.28, 0.34, 0.4, 0][stage - 1] + priorityBias, 0, 0.62);
  const legacyChance = clamp([0.13, 0.12, 0.28, 0.17, 0.15, 0.16, 0.16, 0][stage - 1] + legacyBias, 0, 0.46);

  if (roll < slaChance) return 'sla';
  if (roll < slaChance + priorityChance) return 'priority';
  if (roll < slaChance + priorityChance + legacyChance) return 'legacy';
  return 'normal';
}

function spawnTarget(overrides = {}) {
  const kind = overrides.kind || chooseTargetKind();
  const profile = targetProfiles[kind];
  const direction = overrides.direction ?? (rng() < 0.5 ? 1 : -1);
  const baseZ = overrides.baseZ ?? (kind === 'sla'
    ? randomBetween(7.2, 11.4)
    : kind === 'priority'
      ? randomBetween(7.8, 13.2)
      : randomBetween(8.7, 17.2));
  const limit = targetSpawnLimits(baseZ);
  const baseY = overrides.y ?? randomBetween(3.05, 5.65);
  const stageSpeed = 1 + (state.stage - 1) * 0.055;
  const target = {
    id: targetId,
    ticket: 4400 + targetId,
    kind,
    direction,
    position: {
      x: overrides.x ?? (direction === 1 ? -limit : limit),
      y: baseY,
      z: baseZ,
    },
    baseY,
    baseZ,
    speed: overrides.speed ?? profile.speed * stageSpeed * randomBetween(0.91, 1.12),
    age: 0,
    phase: randomBetween(0, Math.PI * 2),
    waveSpeed: randomBetween(1.25, 2.58),
    amplitudeY: randomBetween(0.24, 0.72),
    amplitudeZ: randomBetween(0.34, kind === 'priority' || kind === 'sla' ? 1.72 : 1.12),
    rotation: { yaw: 0, pitch: 0, roll: 0 },
    hit: false,
    hitAge: 0,
    fallVelocity: 0,
    alpha: 1,
    mesh: null,
    screenCenter: { x: world.width / 2, y: world.height / 2 },
    trail: [],
    trailClock: 0,
    textureOpen: null,
    textureClosed: null,
    criticalEntered: false,
    health: kind === 'critical' ? FINAL_BOSS_HITS : 1,
    maxHealth: kind === 'critical' ? FINAL_BOSS_HITS : 1,
    staggerUntil: 0,
    damagePulse: 0,
    ...overrides,
  };
  target.textureOpen = createTicketTexture(target, false);
  target.textureClosed = createTicketTexture(target, true);
  targets.push(target);
  targetId += 1;
  return target;
}

function spawnCriticalTarget() {
  if (finalTargetSpawned || state.status !== 'running') return null;
  finalTargetSpawned = true;
  const direction = rng() < 0.5 ? 1 : -1;
  const z = 7.7;
  const limit = targetSpawnLimits(z) + 2.8;
  const target = spawnTarget({
    kind: 'critical',
    direction,
    baseZ: z,
    x: direction === 1 ? -limit : limit,
    y: 4.35,
    baseY: 4.35,
    speed: 0,
    amplitudeY: 0.38,
    amplitudeZ: 0.72,
    health: FINAL_BOSS_HITS,
    maxHealth: FINAL_BOSS_HITS,
  });
  target.entryX = target.position.x;
  target.trail = [];
  showMessage('Hovedhendelse identifisert. Fem delhendelser må lukkes.', true, 1500);
  audio.finalTarget();
  vibrate([35, 55, 35]);
  updateBossHud();
  return target;
}

function updateTargetMesh(target) {
  const profile = targetProfiles[target.kind];
  target.mesh = createCuboidMesh({
    center: target.position,
    size: profile.size,
    rotation: target.rotation,
    camera,
    viewport: { width: world.width, height: world.height, horizon: world.horizon },
  });
  target.screenCenter = projectPoint(target.position, camera, { width: world.width, height: world.height, horizon: world.horizon });
}

function updateTargets(delta, now) {
  const escapedIds = [];

  for (const target of targets) {
    if (target.hit) {
      target.hitAge += delta;
      target.fallVelocity += 5.8 * delta;
      target.position.y -= target.fallVelocity * delta;
      target.position.z += 1.15 * delta;
      target.position.x += target.direction * 0.35 * delta;
      target.rotation.roll += target.direction * delta * 5.7;
      target.rotation.pitch += delta * 1.4;
      target.alpha = clamp(1 - target.hitAge / 0.95, 0, 1);
      updateTargetMesh(target);
      continue;
    }

    target.age += delta;
    target.damagePulse = Math.max(0, target.damagePulse - delta * 2.8);
    target.trailClock -= delta;

    if (target.kind === 'critical') {
      const entryDuration = 1.55;
      const staggerScale = now < target.staggerUntil ? 0.18 : 1;
      const movementScale = perkState.bossSpeed * staggerScale;
      if (target.age < entryDuration) {
        const amount = easeOutCubic(target.age / entryDuration);
        target.position.x = lerp(target.entryX, 0, amount);
        target.position.z = lerp(10.8, target.baseZ, amount);
        target.position.y = target.baseY + Math.sin(target.age * 4.2) * 0.12;
      } else {
        target.criticalEntered = true;
        const activeAge = (target.age - entryDuration) * movementScale;
        const aggression = 1 + (target.maxHealth - target.health) * 0.09;
        target.position.x = Math.sin(activeAge * 0.78) * 3.75 * aggression;
        target.position.y = target.baseY + Math.sin(activeAge * 1.52) * 0.48 + Math.sin(activeAge * 0.43) * 0.2;
        target.position.z = target.baseZ + Math.sin(activeAge * 0.9) * target.amplitudeZ;
      }
      target.rotation.yaw = Math.sin(target.age * 0.7 * movementScale) * 0.27;
      target.rotation.pitch = Math.sin(target.age * 0.97 * movementScale) * 0.09;
      target.rotation.roll = Math.sin(target.age * 1.19 * movementScale) * 0.13;
    } else {
      target.position.x += target.direction * target.speed * delta;
      const verticalWave = Math.sin(target.age * target.waveSpeed + target.phase);
      const secondaryWave = Math.sin(target.age * target.waveSpeed * 0.42 + target.phase * 1.7);
      target.position.y = target.baseY + verticalWave * target.amplitudeY + secondaryWave * 0.15;

      if (target.kind === 'priority') {
        const swoop = Math.sin(Math.min(Math.PI, target.age * 0.72));
        target.position.z = target.baseZ - swoop * target.amplitudeZ + Math.sin(target.age * 1.7 + target.phase) * 0.25;
      } else if (target.kind === 'sla') {
        const dive = Math.sin(Math.min(Math.PI, target.age * 0.92));
        target.position.z = target.baseZ - dive * target.amplitudeZ * 0.78;
        target.position.y += Math.sin(target.age * 4.4 + target.phase) * 0.22;
        target.rotation.roll += Math.sin(target.age * 5.2) * 0.08;
      } else if (target.kind === 'legacy') {
        target.position.z = target.baseZ + Math.sin(target.age * 0.9 + target.phase) * target.amplitudeZ;
        target.position.y += Math.sin(target.age * 3.1 + target.phase) * 0.16;
      } else {
        target.position.z = target.baseZ + Math.sin(target.age * 0.76 + target.phase) * target.amplitudeZ;
      }

      target.rotation.yaw = -target.direction * 0.15 + Math.sin(target.age * 0.72 + target.phase) * 0.13;
      target.rotation.pitch = Math.sin(target.age * 1.1 + target.phase) * 0.055;
      target.rotation.roll += -target.direction * Math.cos(target.age * target.waveSpeed + target.phase) * 0.12;
    }

    updateTargetMesh(target);

    if (target.trailClock <= 0 && target.screenCenter.visible) {
      target.trail.unshift({ x: target.screenCenter.x, y: target.screenCenter.y, size: target.screenCenter.scale, life: 1 });
      const trailLength = target.kind === 'sla' ? 18 : target.kind === 'priority' ? 15 : target.kind === 'critical' ? 13 : 10;
      target.trail = target.trail.slice(0, trailLength);
      target.trailClock = target.kind === 'sla' ? 0.032 : 0.045;
    }
    for (const point of target.trail) point.life -= delta * (target.kind === 'sla' ? 2.15 : 1.75);
    target.trail = target.trail.filter((point) => point.life > 0);

    if (target.kind !== 'critical') {
      const screenLimit = targetSpawnLimits(target.position.z) + 2.8;
      if ((target.direction === 1 && target.position.x > screenLimit) || (target.direction === -1 && target.position.x < -screenLimit)) {
        escapedIds.push(target.id);
      }
    }
  }

  if (state.status === 'running' && escapedIds.length) {
    let shieldedCount = 0;
    for (const id of escapedIds) {
      const target = targets.find((candidate) => candidate.id === id);
      const shielded = perkState.shields > 0;
      if (shielded) {
        perkState.shields -= 1;
        shieldedCount += 1;
      }
      state = recordEscape(state, { shielded });
      audio.escape(target ? clamp(target.screenCenter.x / world.width * 2 - 1, -1, 1) : 0);
    }
    updateHud({ rewardMissions: true });
    if (shieldedCount === escapedIds.length) {
      showMessage(`SLA-skjold stoppet ${shieldedCount === 1 ? 'eskaleringen' : `${shieldedCount} eskaleringer`}.`);
      showFloatingScore('SLA-SKJOLD', world.width * 0.5, world.height * 0.38);
    } else {
      showMessage(escapedIds.length > 1 ? 'Flere saker ble eskalert.' : 'Saken ble eskalert.', true, 980);
    }
    renderPerkStrip();
  }

  targets = targets.filter((target) => !escapedIds.includes(target.id) && target.hitAge < 0.98);

  if (state.stage === STAGES.length && !finalTargetSpawned && !quizActive && !quizPending && !perkPending && now >= finalTargetAt) {
    spawnCriticalTarget();
  }
}

function findTargetAt(x, y, { includeNear = false } = {}) {
  const ordered = [...targets]
    .filter((target) => !target.hit && target.mesh?.hull?.length >= 3)
    .sort((a, b) => a.position.z - b.position.z);
  const point = { x, y };
  const padding = (aim.pointerType === 'touch' ? 24 : 12) * perkState.hitboxScale;
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of ordered) {
    const hull = target.mesh.hull;
    if (pointInPolygon(point, hull)) return { target, near: false, distance: 0 };
    const distance = distanceToPolygon(point, hull);
    if (distance < nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
    if (distance <= padding) return { target, near: false, distance };
  }

  if (includeNear && nearest && nearestDistance <= (aim.pointerType === 'touch' ? 48 : 31) * perkState.hitboxScale) {
    return { target: nearest, near: true, distance: nearestDistance };
  }
  return { target: null, near: false, distance: nearestDistance };
}

function updateAimLock() {
  if (state.status !== 'running' || paused || quizActive || quizPending) {
    aim.lockTargetId = null;
    ui.crosshair.classList.remove('is-lock', 'is-near');
    return;
  }
  const result = findTargetAt(aim.x, aim.y, { includeNear: true });
  aim.lockTargetId = result.target?.id || null;
  ui.crosshair.classList.toggle('is-lock', Boolean(result.target && !result.near));
  ui.crosshair.classList.toggle('is-near', Boolean(result.target && result.near));
}

function createHitEffects(target, x, y) {
  const profile = targetProfiles[target.kind];
  const count = reducedMotion ? 10 : target.kind === 'critical' ? 42 : 24;
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(-Math.PI * 0.98, Math.PI * 0.18);
    const speed = randomBetween(90, target.kind === 'critical' ? 390 : 290);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: randomBetween(390, 650),
      width: randomBetween(4, target.kind === 'critical' ? 18 : 13),
      height: randomBetween(3, target.kind === 'critical' ? 15 : 10),
      life: randomBetween(0.48, 0.96),
      maxLife: 0.96,
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-11, 11),
      color: Math.random() < 0.68 ? profile.colors.front : Math.random() < 0.6 ? profile.colors.edge : profile.colors.stripe,
      glow: Math.random() < 0.3,
    });
  }

  shockwaves.push({
    x,
    y,
    radius: target.kind === 'critical' ? 12 : 7,
    speed: target.kind === 'critical' ? 290 : 210,
    life: target.kind === 'critical' ? 0.55 : 0.4,
    maxLife: target.kind === 'critical' ? 0.55 : 0.4,
    color: profile.colors.edge,
    width: target.kind === 'critical' ? 5 : 3,
  });

  tracerLines.push({
    x1: world.width * 0.5 + (aim.x / world.width - 0.5) * 22,
    y1: world.height - 62,
    x2: x,
    y2: y,
    life: 0.13,
    maxLife: 0.13,
    color: profile.colors.edge,
  });
  triggerHitFlash(x, y);
}

function createMissTracer(x, y) {
  tracerLines.push({
    x1: world.width * 0.5,
    y1: world.height - 62,
    x2: x,
    y2: y,
    life: 0.075,
    maxLife: 0.075,
    color: '#ffd66b',
  });
}

function updateEffects(delta) {
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

  for (const tracer of tracerLines) tracer.life -= delta;
  tracerLines = tracerLines.filter((tracer) => tracer.life > 0);
}

function spawnConfetti() {
  const count = reducedMotion ? 45 : 155;
  confetti = Array.from({ length: count }, () => ({
    x: randomBetween(0, world.width),
    y: randomBetween(-world.height * 1.25, -10),
    vx: randomBetween(-38, 38),
    vy: randomBetween(75, 190),
    width: randomBetween(4, 12),
    height: randomBetween(7, 19),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-6, 6),
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));
}

function updateConfetti(delta) {
  for (const piece of confetti) {
    piece.x += piece.vx * delta;
    piece.y += piece.vy * delta;
    piece.vy += 115 * delta;
    piece.rotation += piece.spin * delta;
    if (piece.y > world.height + 25) {
      piece.y = randomBetween(-130, -20);
      piece.x = randomBetween(0, world.width);
      piece.vy = randomBetween(72, 145);
    }
  }
}

function targetPrecision(target, x, y) {
  if (!target?.mesh?.hull?.length) return 0;
  const area = Math.max(1, Math.abs(polygonArea(target.mesh.hull)));
  const radius = Math.max(18, Math.sqrt(area / Math.PI));
  const distance = Math.hypot(x - target.screenCenter.x, y - target.screenCenter.y);
  return clamp(1 - distance / radius, 0, 1);
}

function targetScoreMultiplier(target) {
  let multiplier = runModifier.scoreMultiplier || 1;
  if (target?.kind === 'priority' || target?.kind === 'critical') {
    multiplier *= perkState.priorityMultiplier;
    multiplier *= runModifier.priorityMultiplier || 1;
  }
  if (target?.kind === 'legacy') multiplier *= runModifier.legacyMultiplier || 1;
  if (roundRemainingSeconds() <= OVERTIME_SECONDS) multiplier *= 1.5;
  return multiplier;
}

function awardAutomationBonus(x, y) {
  if (!perkState.automationEvery || state.hits % perkState.automationEvery !== 0) return;
  const amount = Math.round(240 * (runModifier.scoreMultiplier || 1));
  state = awardScore(state, amount, 'automation');
  showFloatingScore(`+${formatScore(amount)} AUTO-LUKK`, x, y - 36);
  showMessage('Automatisering lukket en følgesak.');
  audio.automation?.();
  cameraShake = Math.min(1.2, cameraShake + 0.35);
}

function shoot(x, y, randomValue = rng()) {
  if (state.status !== 'running' || paused || quizActive || quizPending || perkPending) return false;
  const result = findTargetAt(x, y, { includeNear: true });
  const actualTarget = result.near ? null : result.target;
  return resolvePlayerShot(actualTarget, x, y, randomValue, result.near ? result.target : null);
}

function resolvePlayerShot(target, x, y, randomValue = rng(), nearTarget = null) {
  const previousStage = state.stage;
  const bossHit = target?.kind === 'critical';
  const precision = target ? targetPrecision(target, x, y) : 0;
  const protectStreak = !target && perkState.comboGuards > 0 && state.streak > 0;
  const resolution = resolveShot(state, {
    hit: Boolean(target),
    randomValue,
    kind: target?.kind || 'normal',
    precision,
    scoreMultiplier: targetScoreMultiplier(target),
    perfectMultiplier: perkState.perfectMultiplier * (runModifier.perfectMultiplier || 1),
    flowMultiplier: perkState.flowMultiplier * (runModifier.flowMultiplier || 1),
    protectStreak,
    bossHit,
  });
  state = resolution.state;
  const { events } = resolution;

  if (events.guardUsed) perkState.comboGuards = Math.max(0, perkState.comboGuards - 1);

  triggerRecoil(target?.kind === 'critical' ? 1.42 : target?.kind === 'sla' ? 1.1 : 1);
  createMissTracer(x, y);
  audio.shot(clamp(x / world.width * 2 - 1, -1, 1));

  if (target) {
    if (target.kind === 'critical') {
      target.health = Math.max(0, (target.health ?? FINAL_BOSS_HITS) - 1);
      target.damagePulse = 1;
      target.staggerUntil = performance.now() + (perkState.bossSpeed < 1 ? 620 : 410);
      target.textureOpen = createTicketTexture(target, false);
      if (target.health <= 0 || events.won) {
        target.hit = true;
        target.hitAge = 0;
        target.fallVelocity = 0.7;
        target.textureClosed = createTicketTexture(target, true);
      }
    } else {
      target.hit = true;
      target.hitAge = 0;
      target.fallVelocity = 0.25;
    }

    createHitEffects(target, x, y);
    audio.hit(state.streak, clamp(x / world.width * 2 - 1, -1, 1), target.kind);
    hitStopUntil = performance.now() + (target.kind === 'critical' ? 135 : target.kind === 'sla' ? 82 : 68);
    showFloatingScore(`+${formatScore(events.scoreGain)}`, x, y);

    if (events.perfectHit) {
      showMessage(target.kind === 'critical' ? 'Presisjonstreff på hovedhendelsen.' : 'Presisjonstreff — maksimal saksverdi.');
      showFloatingScore('PRESISJON', x, y - 30);
    } else {
      showMessage(events.won ? 'Hovedhendelsen er lukket.' : positiveMessages[Math.floor(rng() * positiveMessages.length)]);
    }
    vibrate(target.kind === 'critical' ? [35, 30, 55] : 20);

    if ([5, 10, 15, 20, 25, 30].includes(state.streak)) {
      ui.comboItem.classList.remove('is-hot');
      void ui.comboItem.offsetWidth;
      ui.comboItem.classList.add('is-hot');
      showStreakAnnouncement(state.streak, state.streak >= 15 ? 'LEGENDARISK REKKE' : 'TREFFREKKE');
      audio.combo(state.streak);
    }

    awardAutomationBonus(x, y);
  } else if (events.guardUsed) {
    audio.nearMiss(clamp(x / world.width * 2 - 1, -1, 1));
    showMessage('Kombobuffer absorberte bommen.');
    showFloatingScore('BUFFER', x, y);
  } else if (nearTarget) {
    audio.nearMiss(clamp(x / world.width * 2 - 1, -1, 1));
    showMessage('Nesten — saken endret bane.', true, 700);
  } else {
    audio.miss(clamp(x / world.width * 2 - 1, -1, 1));
    showMessage('Bom — saken flyr videre.', true, 620);
  }

  if (events.flowActivated) activateFlow(3600, 'Automatisk saksflyt');

  let perkAfterStage = false;
  if (events.stageChanged && state.stage !== previousStage) {
    const stageBonus = 260 + state.stage * 55;
    state = awardScore(state, stageBonus, 'stage');
    showStageBanner(state.stage);
    showFloatingScore(`+${formatScore(stageBonus)} NIVÅBONUS`, world.width * 0.5, world.height * 0.3);
    audio.setStage(state.stage);
    audio.stageUp(state.stage);
    lightning = state.stage >= 6 ? 1 : lightning;
    board.style.setProperty('--stage-accent', stageThemes[state.stage - 1].accent);
    perkAfterStage = PERK_LEVELS.has(state.stage) && perkChoiceIndex < 2;

    if (state.stage === STAGES.length) {
      for (const candidate of targets) {
        if (!candidate.hit && candidate.id !== target?.id && candidate.kind !== 'critical') {
          candidate.direction = candidate.position.x < 0 ? -1 : 1;
          candidate.speed *= 2.1;
        }
      }
      finalTargetAt = performance.now() + (testMode ? 80 : 1450);
    }
  }

  updateHud({ rewardMissions: true });
  renderPerkStrip();

  if (events.won) {
    quizPending = true;
    targets.forEach((candidate) => { candidate.hit = true; });
    winTimer = window.setTimeout(finishRound, testMode ? 70 : 1000);
    return true;
  }

  if (perkAfterStage) {
    deferredQuiz = events.quizTriggered;
    schedulePerkChoice();
  } else if (events.quizTriggered) {
    scheduleQuiz();
  }
  updateAimLock();
  return Boolean(target);
}

function schedulePerkChoice() {
  if (perkPending || state.status !== 'running') return;
  perkPending = true;
  perkFreezeStartedAt = Date.now();
  positionCrosshair();
  updateHud();
  window.setTimeout(openPerkChoice, testMode ? 20 : 520);
}

function openPerkChoice() {
  if (state.status !== 'running' || !perkPending) return;
  ui.stageBanner.classList.remove('is-visible');
  const choices = selectPerkChoices(runSeed, perkChoiceIndex, ownedPerks, 3);
  ui.perkChoiceNumber.textContent = `${perkChoiceIndex + 1}/2`;
  ui.perkTitle.textContent = perkChoiceIndex === 0 ? 'Velg din første forbedring' : 'Fullfør vaktbygget';
  ui.perkOptions.replaceChildren();
  for (const [choiceIndex, perk] of choices.entries()) {
    const button = document.createElement('button');
    button.className = 'perk-option';
    button.type = 'button';
    button.dataset.perk = perk.id;
    button.dataset.key = String(choiceIndex + 1);
    button.innerHTML = `<i aria-hidden="true">${perk.icon}</i><span><b>${perk.name}</b><small>${perk.detail}</small></span><em>Velg</em>`;
    button.addEventListener('click', () => choosePerk(perk.id));
    ui.perkOptions.append(button);
  }
  showOverlay(ui.perkOverlay);
  window.setTimeout(() => ui.perkOptions.querySelector('button')?.focus({ preventScroll: true }), 35);
  audio.perkOpen?.();
}

function choosePerk(perkId) {
  if (!perkPending || !PERK_CATALOG[perkId]) return;
  const frozenFor = Math.max(0, Date.now() - perkFreezeStartedAt);
  if (roundEndsAt) roundEndsAt += frozenFor;
  applyPerk(perkId);
  perkChoiceIndex += 1;
  perkPending = false;
  perkFreezeStartedAt = 0;
  hideOverlay(ui.perkOverlay);
  showMessage(`${PERK_CATALOG[perkId].name} er aktiv resten av vakten.`);
  showFloatingScore(PERK_CATALOG[perkId].icon, world.width * 0.5, world.height * 0.38);
  audio.perk?.();
  updateHud({ rewardMissions: true });
  positionCrosshair();
  canvas.focus({ preventScroll: true });
  if (deferredQuiz) {
    deferredQuiz = false;
    window.setTimeout(scheduleQuiz, testMode ? 20 : 380);
  }
}

function prepareQuestion(question) {
  const options = question.options.map((text, index) => ({ text, correct: index === question.correct }));
  const shuffled = shuffle(options);
  return {
    ...question,
    options: shuffled.map((option) => option.text),
    correct: shuffled.findIndex((option) => option.correct),
  };
}

function nextQuestion() {
  if (!questionDeck.length) {
    questionDeck = shuffle(noarkQuestions);
    if (previousQuestion && questionDeck[0] === previousQuestion && questionDeck.length > 1) {
      [questionDeck[0], questionDeck[1]] = [questionDeck[1], questionDeck[0]];
    }
  }
  const question = questionDeck.shift();
  previousQuestion = question;
  return prepareQuestion(question);
}

function scheduleQuiz() {
  if (quizPending || quizActive || perkPending || state.status !== 'running') return;
  quizPending = true;
  window.clearTimeout(quizTimer);
  quizTimer = window.setTimeout(openQuiz, testMode ? 25 : 560);
}

function openQuiz() {
  if (state.status !== 'running' || perkPending || !quizPending) return;
  ui.stageBanner.classList.remove('is-visible');
  quizActive = true;
  quizPending = false;
  currentQuestion = nextQuestion();
  const reward = Math.max(perkState.quizReward, runModifier.quizReward || 300);
  ui.quizTitle.textContent = currentQuestion.question;
  ui.quizProgress.textContent = `KONTROLLPUNKT ${String(state.quizOffered).padStart(2, '0')}`;
  ui.quizRewardText.textContent = `Riktig: +${formatScore(reward)} og faglig flyt`;
  ui.quizFeedback.textContent = '';
  ui.quizFeedback.className = 'quiz-feedback';
  ui.quizOptions.replaceChildren();

  currentQuestion.options.forEach((option, optionIndex) => {
    const button = document.createElement('button');
    button.className = 'quiz-option';
    button.type = 'button';
    button.textContent = option;
    button.dataset.key = String(optionIndex + 1);
    button.dataset.optionIndex = String(optionIndex);
    button.addEventListener('click', () => answerQuiz(optionIndex));
    ui.quizOptions.append(button);
  });

  positionCrosshair();
  updateHud();
  showOverlay(ui.quizOverlay);
  window.setTimeout(() => ui.quizOptions.querySelector('button')?.focus({ preventScroll: true }), 35);
  audio.quizOpen();
}

function answerQuiz(optionIndex) {
  if (!quizActive || !currentQuestion) return false;
  const correct = optionIndex === currentQuestion.correct;
  const reward = Math.max(perkState.quizReward, runModifier.quizReward || 300);
  const penalty = 125;
  const buttons = [...ui.quizOptions.querySelectorAll('button')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === currentQuestion.correct) button.classList.add('is-correct');
    if (!correct && index === optionIndex) button.classList.add('is-wrong');
  });

  state = recordQuizAnswer(state, correct, { reward, penalty });
  ui.quizFeedback.classList.add(correct ? 'is-correct' : 'is-wrong');
  ui.quizFeedback.textContent = correct
    ? `Korrekt. ${currentQuestion.fact} +${formatScore(reward)} poeng.`
    : `Ikke helt. ${currentQuestion.fact} −${formatScore(penalty)} poeng.`;

  if (correct) {
    activateFlow(6000, 'NOARK 5 // faglig flyt');
    showFloatingScore(`+${formatScore(reward)} NOARK`, world.width / 2, world.height * 0.42);
    audio.quizCorrect();
    vibrate([20, 35, 20]);
  } else {
    board.classList.remove('is-danger');
    void board.offsetWidth;
    board.classList.add('is-danger');
    showFloatingScore(`−${formatScore(penalty)}`, world.width / 2, world.height * 0.42);
    audio.quizWrong();
    vibrate(45);
  }

  updateHud({ rewardMissions: true });
  window.setTimeout(() => {
    quizActive = false;
    currentQuestion = null;
    hideOverlay(ui.quizOverlay);
    updateHud({ rewardMissions: true });
    positionCrosshair();
    if (state.status === 'running') canvas.focus({ preventScroll: true });
    if (state.stage === STAGES.length && !finalTargetSpawned) {
      finalTargetAt = Math.min(finalTargetAt || Infinity, performance.now() + 450);
    }
    if (roundRemainingSeconds() <= 0 && state.status === 'running') {
      state = finishByTimeout(state);
      finishRound();
    }
  }, testMode ? 60 : 1350);
  return correct;
}

function startRound() {
  window.clearTimeout(messageTimer);
  window.clearTimeout(quizTimer);
  window.clearTimeout(winTimer);
  window.clearTimeout(stageTimer);
  window.clearTimeout(streakTimer);

  const configuration = runConfigForMode(selectedMode);
  runMode = configuration.mode;
  runSeed = configuration.seed;
  runModifier = configuration.modifier;
  rng = createSeededRandom(runSeed);
  if (runMode === 'random') randomPreviewSeed = randomSeed();
  profile.name = sanitizeName(ui.playerName.value || profile.name);
  writeProfile();

  state = startGame(state);
  selectedMissionIds = selectMissionIds(runSeed, 3);
  rewardedMissions = new Set();
  missionSnapshot = {};
  ownedPerks = [];
  perkState = createPerkState();
  perkChoiceIndex = 0;
  perkPending = false;
  perkFreezeStartedAt = 0;
  deferredQuiz = false;
  resultFinalized = false;
  resultEntry = null;
  resultChallengeUrl = '';
  roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
  pauseStartedAt = 0;
  overtimeAnnounced = false;
  lastClockSecond = -1;

  targets = [];
  particles = [];
  shockwaves = [];
  tracerLines = [];
  confetti = [];
  targetId = 1;
  spawnClock = testMode ? 0.05 : 1.65;
  lastFrame = performance.now();
  animationTime = 0;
  stageVisual = 1;
  paused = false;
  quizActive = false;
  quizPending = false;
  currentQuestion = null;
  questionDeck = shuffle(noarkQuestions);
  previousQuestion = null;
  flowUntil = 0;
  flowSource = 'Saksflyt aktiv';
  hitStopUntil = 0;
  finalTargetAt = 0;
  finalTargetSpawned = false;
  recoil = 0;
  cameraShake = 0;
  lightning = 0;
  aim.x = world.width / 2;
  aim.y = Math.max(115, world.height * 0.41);
  aim.visible = true;
  aim.pointerType = 'keyboard';
  aim.hideAt = 0;
  aim.lockTargetId = null;

  createSceneSeeds(runSeed);
  renderLevelRail();
  renderMissionList();
  renderPerkStrip();
  hideOverlay(ui.startOverlay);
  hideOverlay(ui.perkOverlay);
  hideOverlay(ui.quizOverlay);
  hideOverlay(ui.pauseOverlay);
  hideOverlay(ui.winOverlay);
  ui.stageBanner.classList.remove('is-visible');
  ui.powerup.classList.remove('is-active');
  board.classList.remove('is-flowing', 'is-danger', 'is-critical', 'is-overtime');
  board.style.setProperty('--stage-accent', stageThemes[0].accent);
  ui.operationClock.textContent = formatClock(ROUND_SECONDS);
  ui.quizRewardText.textContent = `Riktig: +${formatScore(Math.max(perkState.quizReward, runModifier.quizReward || 300))} og faglig flyt`;
  updateWeaponPose();
  positionCrosshair();
  updateHud();
  updateClock();

  const opening = runMode === 'duel' && incomingDuel
    ? `Kollegaduell startet. Slå ${incomingDuel.name || 'kollegaen'}: ${formatScore(incomingDuel.score)} poeng.`
    : `${modeLabel()} startet. Dagens effekt: ${runModifier.name}.`;
  showMessage(opening, false, 1600);
  showStageBanner(1);
  audio.ensure();
  audio.stopAmbient();
  audio.setStage(1);
  audio.startAmbient(1);
  audio.start();
  canvas.focus({ preventScroll: true });
}

function finishRound() {
  if (resultFinalized || !['won', 'timeout'].includes(state.status)) return;
  resultFinalized = true;
  window.clearTimeout(messageTimer);
  window.clearTimeout(quizTimer);
  window.clearTimeout(winTimer);
  window.clearTimeout(stageTimer);
  quizPending = false;
  quizActive = false;
  perkPending = false;
  paused = false;
  pauseStartedAt = 0;
  hideOverlay(ui.quizOverlay);
  hideOverlay(ui.perkOverlay);
  hideOverlay(ui.pauseOverlay);
  positionCrosshair();

  const won = state.status === 'won';
  const seconds = clamp(ROUND_SECONDS - roundRemainingSeconds(), 0, ROUND_SECONDS);
  const accuracy = Math.round(accuracyPercent(state));
  const rank = performanceRank(state, selectedMissionIds);
  const missions = missionCount(state, selectedMissionIds);
  const xp = experienceAward(state, selectedMissionIds);
  const code = resultCode(runSeed, state.score, rank.grade);
  const completedMissionIds = selectedMissionIds.filter((id) => missionStatus(state, id)?.complete);
  const badges = [
    ...completedMissionIds.map((id) => `mission:${id}`),
    ...ownedPerks.map((id) => `perk:${id}`),
  ];
  if (accuracy >= 90 && state.shots >= 20) badges.push('skarpskytter');
  if (state.bestStreak >= 15) badges.push('kombomester');
  if (state.flowActivations >= 4) badges.push('flytsone');
  if (runMode === 'duel' && incomingDuel && state.score > incomingDuel.score) badges.push('duellvinner');

  const careerBefore = careerSummary();
  profile = applySessionToProfile(profile, {
    name: profile.name,
    xp,
    score: state.score,
    grade: rank.grade,
    won,
    daily: runMode === 'daily',
    dateKey: todayKey,
    badges,
  });
  writeProfile();
  const careerAfterValue = careerSummary();
  const leveledUp = careerAfterValue.level > careerBefore.level;

  resultEntry = {
    id: `${Date.now()}-${runSeed}`,
    name: profile.name || 'Anonym',
    score: state.score,
    cases: state.casesSolved,
    seconds,
    accuracy,
    grade: rank.grade,
    missions,
    mode: runMode,
    seed: runSeed,
    dateKey: todayKey,
    code,
  };
  leaderboard = sortLeaderboard([resultEntry, ...leaderboard], 80);
  writeLeaderboard();

  const duelToken = encodeDuel({ seed: runSeed, score: state.score, name: profile.name || 'En kollega', grade: rank.grade, code });
  const challengeUrl = new URL(window.location.href);
  challengeUrl.search = '';
  challengeUrl.hash = '';
  challengeUrl.searchParams.set('duell', duelToken);
  resultChallengeUrl = challengeUrl.toString();

  ui.resultKicker.textContent = won ? 'Operasjonen er fullført' : 'Kaffepausen er over';
  ui.winTitle.innerHTML = won ? 'Du skapte<br><span>null restanse</span>' : 'Vakten er levert.<br><span>Køen lever videre.</span>';
  ui.winSummary.textContent = won
    ? `${TARGET_CASES} saker ble lukket gjennom åtte nivåer på ${formatClock(seconds)}. Resultatet er klart for kaffemaskinen.`
    : `${state.casesSolved} av ${TARGET_CASES} saker ble lukket før fem minutter var gått. Neste vakt starter med mer erfaring.`;
  ui.rankGrade.textContent = rank.grade;
  ui.rankTitle.textContent = rank.title;
  ui.rankDetail.textContent = rank.detail;
  ui.rankEmblem.dataset.grade = rank.grade;
  ui.resultCode.textContent = code;
  ui.resultMode.textContent = modeLabel(runMode);
  ui.resultPoints.textContent = formatScore(state.score);
  ui.resultCases.textContent = `${state.casesSolved}/${TARGET_CASES}`;
  ui.resultStage.textContent = `Nivå ${state.stage}/${STAGES.length}`;
  ui.resultAccuracy.textContent = `${accuracy} %`;
  ui.resultShots.textContent = `${state.shots} skudd`;
  ui.resultCombo.textContent = `x${state.bestStreak}`;
  ui.resultFlow.textContent = `${state.flowActivations} flytaktivering${state.flowActivations === 1 ? '' : 'er'}`;
  ui.resultQuiz.textContent = `${state.quizCorrect}/${state.quizAnswered}`;
  ui.resultMissions.textContent = `${missions}/${selectedMissionIds.length}`;
  ui.resultEscalations.textContent = `${state.escalations} eskalering${state.escalations === 1 ? '' : 'er'}`;
  ui.resultDuel.textContent = runMode === 'duel' && incomingDuel
    ? state.score > incomingDuel.score
      ? `Du vant med ${formatScore(state.score - incomingDuel.score)} poeng`
      : `${formatScore(incomingDuel.score - state.score)} poeng bak ${incomingDuel.name || 'kollegaen'}`
    : won ? 'Klar til å utfordre en kollega' : 'Ny personlig målestokk';
  ui.xpGain.textContent = `+${formatScore(xp)}`;
  ui.careerRewardLabel.textContent = leveledUp ? 'NY KARRIERETITTEL' : 'Karrierefremgang';
  ui.careerAfter.textContent = `Nivå ${careerAfterValue.level} · ${careerAfterValue.title}`;
  ui.careerAfterFill.style.width = `${careerAfterValue.progress}%`;
  ui.careerAfterText.textContent = careerAfterValue.next
    ? `${formatScore(careerAfterValue.xpToNext)} XP til ${careerAfterValue.next.title}`
    : 'Maksnivå nådd';
  ui.resultLeaderboardLabel.textContent = modeLabel(runMode);
  renderLeaderboard(ui.resultLeaderboard, leaderboardEntriesFor(runMode, runSeed));
  renderResultBadges({ completedMissionIds, leveledUp });
  updateCareerUi();
  updateHud();

  if (won || state.casesSolved >= 30) spawnConfetti();
  audio.stopAmbient();
  if (won) audio.win();
  else audio.timeout?.();
  if (leveledUp) window.setTimeout(() => audio.careerUp?.(), 720);
  showOverlay(ui.winOverlay);
  vibrate(won ? [40, 45, 60, 45, 90] : [30, 45, 30]);
  ui.restartButton.focus({ preventScroll: true });
}

function renderResultBadges({ completedMissionIds = [], leveledUp = false } = {}) {
  const badges = [];
  for (const id of completedMissionIds) badges.push({ icon: '✓', label: MISSION_CATALOG[id].label });
  for (const id of ownedPerks) badges.push({ icon: PERK_CATALOG[id].icon, label: PERK_CATALOG[id].name });
  if (state.bestStreak >= 15) badges.push({ icon: 'x15', label: 'Kombomester' });
  if (accuracyPercent(state) >= 90 && state.shots >= 20) badges.push({ icon: '90', label: 'Skarpskytter' });
  if (runMode === 'duel' && incomingDuel && state.score > incomingDuel.score) badges.push({ icon: 'VS', label: 'Duellvinner' });
  if (leveledUp) badges.unshift({ icon: '↑', label: 'Karrierenivå opp' });
  if (!badges.length) badges.push({ icon: 'SM', label: 'Vakten levert' });

  ui.badgeRow.replaceChildren();
  badges.slice(0, 9).forEach((entry) => {
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.innerHTML = `<i>${escapeHtml(entry.icon)}</i><b>${escapeHtml(entry.label)}</b>`;
    ui.badgeRow.append(badge);
  });
}

function togglePause(force) {
  if (state.status !== 'running' || quizActive || perkPending) return;
  const next = typeof force === 'boolean' ? force : !paused;
  if (next === paused) return;
  paused = next;
  if (paused) {
    pauseStartedAt = Date.now();
    showOverlay(ui.pauseOverlay);
    ui.resumeButton.focus({ preventScroll: true });
    audio.stopAmbient();
  } else {
    if (roundEndsAt && pauseStartedAt) roundEndsAt += Math.max(0, Date.now() - pauseStartedAt);
    pauseStartedAt = 0;
    hideOverlay(ui.pauseOverlay);
    audio.startAmbient(state.stage);
    canvas.focus({ preventScroll: true });
  }
  updateClock();
  updateHud();
  positionCrosshair();
}

function themeAt(value) {
  const clamped = clamp(value, 1, stageThemes.length);
  const lowerIndex = Math.floor(clamped) - 1;
  const upperIndex = Math.min(stageThemes.length - 1, lowerIndex + 1);
  const amount = clamped - Math.floor(clamped);
  const lower = stageThemes[lowerIndex];
  const upper = stageThemes[upperIndex];
  const theme = {};
  for (const key of Object.keys(lower)) theme[key] = mixColor(lower[key], upper[key], amount);
  return theme;
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

function drawPolygon(points, fillStyle, strokeStyle = null, lineWidth = 1) {
  if (!points?.length) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  context.closePath();
  if (fillStyle) {
    context.fillStyle = fillStyle;
    context.fill();
  }
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function drawCloud(x, y, scale, opacity) {
  context.save();
  context.globalAlpha = opacity;
  const gradient = context.createLinearGradient(0, y, 0, y + 46 * scale);
  gradient.addColorStop(0, 'rgba(247,255,247,.88)');
  gradient.addColorStop(1, 'rgba(203,224,216,.42)');
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(255,255,255,.14)';
  context.shadowBlur = 18 * scale;
  context.beginPath();
  context.ellipse(x + 45 * scale, y + 24 * scale, 48 * scale, 20 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 28 * scale, y + 18 * scale, 25 * scale, 21 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 61 * scale, y + 13 * scale, 31 * scale, 25 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 83 * scale, y + 25 * scale, 25 * scale, 17 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawMountainLayer({ baseY, amplitude, color, parallax, seedOffset, step }) {
  const cameraOffset = camera.x * parallax;
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-step, world.height);
  context.lineTo(-step, baseY);
  for (let index = -2; index <= Math.ceil(world.width / step) + 2; index += 1) {
    const seed = mountainSeeds[(index + seedOffset + mountainSeeds.length * 4) % mountainSeeds.length];
    const x = index * step - cameraOffset;
    const peak = baseY - amplitude * (0.55 + seed.a * 0.62);
    const shoulder = baseY - amplitude * (0.12 + seed.b * 0.22);
    context.lineTo(x, baseY);
    context.quadraticCurveTo(x + step * 0.34, peak, x + step * 0.58, shoulder);
    context.quadraticCurveTo(x + step * 0.83, peak + amplitude * 0.22, x + step, baseY);
  }
  context.lineTo(world.width + step, world.height);
  context.closePath();
  context.fill();
}

function drawSkyline(theme, time, parallaxX) {
  const baseY = world.horizon + world.height * 0.018;
  const unit = clamp(world.width * 0.035, 34, 58);
  const offset = ((time * 1.7) + parallaxX * 18) % unit;

  context.save();
  context.fillStyle = theme.skyline;
  for (let index = -2; index < Math.ceil(world.width / unit) + 3; index += 1) {
    const seed = skylineSeeds[(index + 120) % skylineSeeds.length];
    const width = unit * seed.width;
    const height = world.height * (0.045 + seed.height * 0.07);
    const x = index * unit - offset;
    const y = baseY - height;
    context.fillRect(x, y, width, height);
    context.fillStyle = 'rgba(176,255,226,.13)';
    const rows = Math.max(1, Math.floor(height / 13));
    for (let row = 0; row < rows; row += 1) {
      for (let light = 0; light < seed.lights; light += 1) {
        if ((row + light + index) % 3 === 0) continue;
        context.fillRect(x + 7 + light * 10, y + 8 + row * 12, 4, 3);
      }
    }
    context.fillStyle = theme.skyline;
  }
  context.restore();
}

function drawPerspectiveGround(theme, parallaxX) {
  const horizon = world.horizon;
  const height = world.height;
  const width = world.width;
  const ground = context.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, theme.groundTop);
  ground.addColorStop(0.48, mixColor(stageThemes[0].groundTop, stageThemes[state.stage - 1].groundBottom, 0.45));
  ground.addColorStop(1, theme.groundBottom);
  context.fillStyle = ground;
  context.fillRect(0, horizon, width, height - horizon);

  context.save();
  const vanishingX = width * 0.5 - parallaxX * 38;
  context.strokeStyle = state.stage === STAGES.length ? 'rgba(255,214,107,.22)' : 'rgba(121,237,208,.18)';
  context.lineWidth = 1;
  for (let index = -13; index <= 13; index += 1) {
    context.globalAlpha = 0.11 + Math.abs(index) * 0.006;
    context.beginPath();
    context.moveTo(vanishingX + index * 4.4, horizon);
    context.lineTo(vanishingX + index * width * 0.105, height + 8);
    context.stroke();
  }

  for (let step = 0; step <= 13; step += 1) {
    const progress = step / 13;
    const y = horizon + (height - horizon) * progress ** 2.2;
    context.globalAlpha = 0.06 + progress * 0.22;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  // A central operations corridor strengthens the vanishing point.
  context.save();
  const corridor = context.createLinearGradient(vanishingX, horizon, vanishingX, height);
  corridor.addColorStop(0, 'rgba(255,255,255,0)');
  corridor.addColorStop(1, state.stage === STAGES.length ? 'rgba(255,214,107,.09)' : 'rgba(105,242,206,.06)');
  context.fillStyle = corridor;
  context.beginPath();
  context.moveTo(vanishingX - 4, horizon);
  context.lineTo(vanishingX + 4, horizon);
  context.lineTo(vanishingX + width * 0.13, height);
  context.lineTo(vanishingX - width * 0.13, height);
  context.closePath();
  context.fill();
  context.restore();

  context.fillStyle = state.stage === STAGES.length ? 'rgba(255,214,107,.34)' : 'rgba(105,242,206,.25)';
  for (let index = 0; index < 12; index += 1) {
    const progress = (index + 1) / 12;
    const y = horizon + (height - horizon) * progress ** 2.15;
    const spread = width * 0.08 * progress;
    const size = 1 + progress * 2.4;
    context.fillRect(vanishingX - spread, y, size, size);
    context.fillRect(vanishingX + spread, y, size, size);
  }
}

function drawBackground(now) {
  const time = animationTime;
  const theme = themeAt(stageVisual);
  const parallaxX = aim.x / Math.max(1, world.width) - 0.5;
  const parallaxY = aim.y / Math.max(1, world.height) - 0.5;
  const width = world.width;
  const height = world.height;
  const horizon = world.horizon;

  const sky = context.createLinearGradient(0, 0, 0, horizon + 40);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(0.52, theme.skyMid);
  sky.addColorStop(0.88, theme.horizon);
  sky.addColorStop(1, theme.haze);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const nightAlpha = smoothstep(5.25, 8, stageVisual);
  if (nightAlpha > 0.01) {
    context.save();
    context.globalAlpha = nightAlpha;
    for (const star of stars) {
      const twinkle = 0.35 + Math.sin(time * 2.2 + star.phase) * 0.28;
      context.fillStyle = `rgba(235,250,255,${clamp(twinkle, 0.1, 0.8)})`;
      context.beginPath();
      context.arc(star.x * width - parallaxX * 12, star.y * height - parallaxY * 7, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  const sunAlpha = 1 - smoothstep(4.4, 7, stageVisual);
  if (sunAlpha > 0.01) {
    const sunX = width * 0.79 - parallaxX * 30;
    const sunY = height * 0.15 - parallaxY * 12;
    const radius = clamp(width * 0.027, 24, 44);
    context.save();
    context.globalAlpha = sunAlpha;
    const glow = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, radius * 3.2);
    glow.addColorStop(0, 'rgba(255,255,218,.96)');
    glow.addColorStop(0.22, 'rgba(255,218,105,.88)');
    glow.addColorStop(1, 'rgba(255,190,66,0)');
    context.fillStyle = glow;
    context.fillRect(sunX - radius * 3.3, sunY - radius * 3.3, radius * 6.6, radius * 6.6);
    context.fillStyle = '#ffe583';
    context.beginPath();
    context.arc(sunX, sunY, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (nightAlpha > 0.02) {
    const moonX = width * 0.79 - parallaxX * 22;
    const moonY = height * 0.15 - parallaxY * 8;
    const radius = clamp(width * 0.02, 19, 34);
    context.save();
    context.globalAlpha = nightAlpha;
    const moonGlow = context.createRadialGradient(moonX, moonY, 1, moonX, moonY, radius * 3.2);
    moonGlow.addColorStop(0, 'rgba(255,244,189,.72)');
    moonGlow.addColorStop(1, 'rgba(255,214,107,0)');
    context.fillStyle = moonGlow;
    context.fillRect(moonX - radius * 3.3, moonY - radius * 3.3, radius * 6.6, radius * 6.6);
    context.fillStyle = '#f5e8ba';
    context.beginPath();
    context.arc(moonX, moonY, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = theme.skyTop;
    context.beginPath();
    context.arc(moonX + radius * 0.38, moonY - radius * 0.15, radius * 0.94, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Aurora is reserved for the final phase.
  if (nightAlpha > 0.05) {
    context.save();
    context.globalAlpha = smoothstep(6.55, 8, stageVisual) * 0.32;
    context.lineWidth = 25;
    context.lineCap = 'round';
    for (let ribbon = 0; ribbon < 3; ribbon += 1) {
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(105,242,206,0)');
      gradient.addColorStop(0.35, ribbon === 1 ? 'rgba(119,185,255,.5)' : 'rgba(105,242,206,.55)');
      gradient.addColorStop(0.72, 'rgba(255,214,107,.22)');
      gradient.addColorStop(1, 'rgba(105,242,206,0)');
      context.strokeStyle = gradient;
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 20) {
        const y = height * (0.18 + ribbon * 0.06) + Math.sin(x * 0.009 + time * 0.22 + ribbon) * 24;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.restore();
  }

  for (const cloud of clouds) {
    const layerFactor = 0.45 + cloud.layer * 0.27;
    const x = ((cloud.x + time * cloud.speed) % 1.25 - 0.12) * width - parallaxX * 38 * layerFactor;
    const y = cloud.y * height - parallaxY * 10 * layerFactor;
    const stormDim = 1 - smoothstep(4.4, 6.2, stageVisual) * 0.52;
    drawCloud(x, y, cloud.scale, cloud.opacity * stormDim);
  }

  const haze = context.createLinearGradient(0, horizon - height * 0.2, 0, horizon + 25);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(236,222,181,.14)');
  context.fillStyle = haze;
  context.fillRect(0, horizon - height * 0.22, width, height * 0.25);

  drawMountainLayer({ baseY: horizon + 22, amplitude: height * 0.16, color: theme.mountainFar, parallax: 12, seedOffset: 7, step: clamp(width * 0.12, 90, 170) });
  drawMountainLayer({ baseY: horizon + 34, amplitude: height * 0.115, color: theme.mountainNear, parallax: 22, seedOffset: 31, step: clamp(width * 0.095, 72, 135) });
  drawSkyline(theme, time, parallaxX);
  drawPerspectiveGround(theme, parallaxX);

  // Foreground silhouettes create a near plane around the weapon.
  context.fillStyle = 'rgba(2,15,19,.72)';
  for (let x = -30; x < width + 50; x += 36) {
    const radius = 25 + ((x + 90) % 5) * 3;
    const sway = Math.sin(time * 1.25 + x * 0.07) * 2.2;
    context.beginPath();
    context.arc(x + sway, height + 7, radius, Math.PI, Math.PI * 2);
    context.fill();
  }

  const stormAlpha = smoothstep(4.35, 5.9, stageVisual) * (1 - smoothstep(6.8, 8, stageVisual));
  if (stormAlpha > 0.02) {
    context.save();
    context.globalAlpha = stormAlpha * 0.42;
    context.strokeStyle = 'rgba(190,225,235,.55)';
    context.lineWidth = 1;
    for (const drop of rain) {
      const y = ((drop.y + time * drop.speed) % 1.1) * height;
      const x = drop.x * width + y * 0.09;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - drop.length * 0.38, y + drop.length);
      context.stroke();
    }
    context.restore();
  }

  context.save();
  for (const mote of dust) {
    const drift = Math.sin(time * mote.speed + mote.phase);
    context.globalAlpha = 0.08 + (drift + 1) * 0.045;
    context.fillStyle = state.stage === STAGES.length ? '#ffd66b' : state.stage >= 6 ? '#b7d8ff' : '#b7ffe9';
    context.beginPath();
    context.arc(mote.x * width + drift * 13 - parallaxX * 9, mote.y * height, mote.size, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  if (lightning > 0.01) {
    context.fillStyle = `rgba(190,224,255,${lightning * 0.17})`;
    context.fillRect(0, 0, width, height);
  }

  // Camera recoil adds a faint exposure pulse rather than a full white flash.
  if (recoil > 0.02) {
    const exposure = context.createRadialGradient(width * 0.5, height * 0.78, 10, width * 0.5, height * 0.78, height * 0.52);
    exposure.addColorStop(0, `rgba(255,227,155,${recoil * 0.045})`);
    exposure.addColorStop(1, 'rgba(255,227,155,0)');
    context.fillStyle = exposure;
    context.fillRect(0, 0, width, height);
  }

  // Slow-motion field.
  if (now < flowUntil) {
    const pulse = 0.5 + Math.sin(now * 0.006) * 0.5;
    context.save();
    context.strokeStyle = `rgba(105,242,206,${0.12 + pulse * 0.1})`;
    context.lineWidth = 2;
    const radius = Math.max(width, height) * (0.38 + pulse * 0.015);
    context.beginPath();
    context.arc(width / 2, height * 0.47, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function interpolatePoint(a, b, amount) {
  return { x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount) };
}

function drawTexturedQuad(image, quad, slices = 16) {
  if (!image || quad.length !== 4) return;
  const [topLeft, topRight, bottomRight, bottomLeft] = quad;
  const sourceSlice = image.width / slices;

  for (let index = 0; index < slices; index += 1) {
    const t0 = index / slices;
    const t1 = (index + 1) / slices;
    const top0 = interpolatePoint(topLeft, topRight, t0);
    const top1 = interpolatePoint(topLeft, topRight, t1);
    const bottom0 = interpolatePoint(bottomLeft, bottomRight, t0);
    const bottom1 = interpolatePoint(bottomLeft, bottomRight, t1);
    const sourceX = index * sourceSlice;

    context.save();
    context.beginPath();
    context.moveTo(top0.x, top0.y);
    context.lineTo(top1.x + 0.8, top1.y);
    context.lineTo(bottom1.x + 0.8, bottom1.y + 0.8);
    context.lineTo(bottom0.x, bottom0.y + 0.8);
    context.closePath();
    context.clip();

    context.translate(top0.x, top0.y);
    context.transform(
      (top1.x - top0.x) / sourceSlice,
      (top1.y - top0.y) / sourceSlice,
      (bottom0.x - top0.x) / image.height,
      (bottom0.y - top0.y) / image.height,
      0,
      0,
    );
    context.drawImage(image, sourceX, 0, sourceSlice + 1, image.height, 0, 0, sourceSlice + 1, image.height);
    context.restore();
  }
}

function drawTargetShadow(target) {
  const groundPoint = projectPoint(
    { x: target.position.x, y: 0.04, z: target.position.z + 0.3 },
    camera,
    { width: world.width, height: world.height, horizon: world.horizon },
  );
  if (!groundPoint.visible) return;
  const profile = targetProfiles[target.kind];
  const width = profile.size.x * groundPoint.scale * 0.72;
  const altitude = clamp(target.position.y / 6, 0, 1);
  context.save();
  context.globalAlpha = target.alpha * (0.28 - altitude * 0.11);
  context.fillStyle = '#020a0f';
  context.shadowColor = 'rgba(0,0,0,.58)';
  context.shadowBlur = 14 + altitude * 18;
  context.translate(groundPoint.x, groundPoint.y);
  context.rotate(target.rotation.roll * 0.22);
  context.scale(1, 0.2 + 0.05 * (1 - altitude));
  context.beginPath();
  context.ellipse(0, 0, width * 0.5, width * 0.26, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawTargetTrail(target) {
  if (target.hit || target.trail.length < 2) return;
  const profile = targetProfiles[target.kind];
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (let index = 1; index < target.trail.length; index += 1) {
    const current = target.trail[index - 1];
    const next = target.trail[index];
    const alpha = clamp(next.life, 0, 1) * (target.kind === 'priority' ? 0.34 : 0.2);
    context.strokeStyle = target.kind === 'critical'
      ? `rgba(255,214,107,${alpha})`
      : target.kind === 'priority'
        ? `rgba(255,139,126,${alpha})`
        : `rgba(210,255,242,${alpha})`;
    context.lineWidth = clamp(current.size * 0.035 * next.life, 1, 5);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
  }
  context.restore();
}

function drawCriticalAura(target) {
  if (target.kind !== 'critical' || target.hit || !target.mesh?.hull?.length) return;
  const center = target.screenCenter;
  const projectedWidth = Math.max(...target.mesh.hull.map((point) => point.x)) - Math.min(...target.mesh.hull.map((point) => point.x));
  const pulse = 0.5 + Math.sin(animationTime * 4.1) * 0.5;
  context.save();
  context.translate(center.x, center.y);
  context.rotate(animationTime * 0.35);
  context.strokeStyle = `rgba(255,214,107,${0.2 + pulse * 0.22})`;
  context.lineWidth = 2;
  context.setLineDash([9, 8]);
  context.beginPath();
  context.ellipse(0, 0, projectedWidth * (0.62 + pulse * 0.025), projectedWidth * 0.38, 0, 0, Math.PI * 2);
  context.stroke();
  context.rotate(-animationTime * 0.78);
  context.strokeStyle = `rgba(255,108,95,${0.17 + (1 - pulse) * 0.2})`;
  context.setLineDash([3, 10]);
  context.beginPath();
  context.ellipse(0, 0, projectedWidth * 0.73, projectedWidth * 0.45, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawTarget(target) {
  if (!target.mesh || !target.screenCenter.visible) return;
  const profile = targetProfiles[target.kind];
  const mesh = target.mesh;
  const frontFace = mesh.faces.find((face) => face.name === 'front');

  drawTargetShadow(target);
  drawTargetTrail(target);
  drawCriticalAura(target);

  context.save();
  context.globalAlpha = target.alpha;
  if (target.kind === 'priority' || target.kind === 'critical') {
    context.shadowColor = target.kind === 'critical' ? 'rgba(255,214,107,.24)' : 'rgba(255,93,83,.18)';
    context.shadowBlur = target.kind === 'critical' ? 26 : 15;
  }

  for (const face of mesh.faces) {
    if (face.points.some((point) => !point.visible) || Math.abs(polygonArea(face.points)) < 0.35) continue;
    let color = profile.colors.front;
    if (face.name === 'top') color = profile.colors.light;
    else if (face.name === 'right' || face.name === 'bottom') color = profile.colors.dark;
    else if (face.name === 'left' || face.name === 'back') color = shadeColor(profile.colors.front, face.light);

    const fill = context.createLinearGradient(
      Math.min(...face.points.map((point) => point.x)),
      Math.min(...face.points.map((point) => point.y)),
      Math.max(...face.points.map((point) => point.x)),
      Math.max(...face.points.map((point) => point.y)),
    );
    fill.addColorStop(0, shadeColor(color, 1.13));
    fill.addColorStop(0.5, color);
    fill.addColorStop(1, shadeColor(color, 0.7));
    drawPolygon(face.points, fill, face.name === 'front' ? profile.colors.edge : 'rgba(255,255,255,.18)', face.name === 'front' ? 1.8 : 1.05);
  }

  if (frontFace && frontFace.points.every((point) => point.visible) && Math.abs(polygonArea(frontFace.points)) > 14) {
    const [bottomLeft, bottomRight, topRight, topLeft] = frontFace.points;
    const texture = target.hit ? target.textureClosed : target.textureOpen;
    drawTexturedQuad(texture, [topLeft, topRight, bottomRight, bottomLeft], target.kind === 'critical' ? 22 : 16);

    // A moving specular scan line makes the face feel like a lit object rather than a flat card.
    const scan = (target.age * 0.42 + target.id * 0.17) % 1;
    const left = interpolatePoint(topLeft, bottomLeft, scan);
    const right = interpolatePoint(topRight, bottomRight, scan);
    context.save();
    drawPolygon([topLeft, topRight, bottomRight, bottomLeft], null);
    context.clip();
    context.strokeStyle = target.kind === 'critical' ? 'rgba(255,226,130,.22)' : 'rgba(255,255,255,.14)';
    context.lineWidth = clamp(target.screenCenter.scale * 0.02, 1, 4);
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
    context.stroke();
    context.restore();
  }
  context.restore();
}

function drawEffects() {
  for (const tracer of tracerLines) {
    const alpha = clamp(tracer.life / tracer.maxLife, 0, 1);
    const gradient = context.createLinearGradient(tracer.x1, tracer.y1, tracer.x2, tracer.y2);
    gradient.addColorStop(0, `rgba(255,214,107,${alpha * 0.05})`);
    gradient.addColorStop(0.72, `rgba(255,244,196,${alpha * 0.34})`);
    gradient.addColorStop(1, `rgba(255,255,255,${alpha * 0.8})`);
    context.save();
    context.strokeStyle = gradient;
    context.lineWidth = 1.5 + alpha * 2;
    context.shadowColor = tracer.color;
    context.shadowBlur = 11;
    context.beginPath();
    context.moveTo(tracer.x1, tracer.y1);
    context.lineTo(tracer.x2, tracer.y2);
    context.stroke();
    context.restore();
  }

  for (const wave of shockwaves) {
    context.save();
    context.globalAlpha = clamp(wave.life / wave.maxLife, 0, 1);
    context.strokeStyle = wave.color;
    context.lineWidth = wave.width;
    context.shadowColor = wave.color;
    context.shadowBlur = 13;
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
    if (particle.glow) {
      context.shadowColor = particle.color;
      context.shadowBlur = 9;
    }
    context.fillStyle = particle.color;
    context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
    context.fillStyle = 'rgba(255,255,255,.3)';
    context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, 1.5);
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
    context.fillStyle = 'rgba(255,255,255,.25)';
    context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, 1.3);
    context.restore();
  }
}

function render(now) {
  context.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
  context.clearRect(0, 0, world.width, world.height);

  const shakeX = reducedMotion ? 0 : (Math.random() - 0.5) * cameraShake * 4;
  const shakeY = reducedMotion ? 0 : (Math.random() - 0.5) * cameraShake * 2.7;
  context.save();
  context.translate(shakeX, shakeY + recoil * 1.8);
  drawBackground(now);

  const orderedTargets = [...targets].sort((a, b) => b.position.z - a.position.z);
  for (const target of orderedTargets) drawTarget(target);
  drawEffects();
  if (confetti.length) drawConfetti();
  context.restore();
}

function spawnIntervalForStage(stage) {
  const base = [2.45, 2.22, 2.02, 1.82, 1.62, 1.46, 1.32, 99][stage - 1] || 2;
  const modifier = runModifier.extraTargets ? 0.9 : 1;
  return randomBetween(base * 0.82, base * 1.18) * modifier;
}

function maxTargetsForStage(stage) {
  const desktop = [2, 2, 3, 3, 4, 4, 5, 1][stage - 1] || 2;
  const modified = desktop + (runModifier.extraTargets || 0);
  if (!touchDevice) return modified;
  return Math.max(1, modified - (stage >= 5 ? 1 : 0));
}

function updateCamera(rawDelta) {
  const normalizedX = clamp(aim.x / Math.max(1, world.width) * 2 - 1, -1, 1);
  const normalizedY = clamp(aim.y / Math.max(1, world.height) * 2 - 1, -1, 1);
  const targetX = normalizedX * 0.36;
  const targetY = 2.18 + normalizedY * 0.12 - recoil * 0.03;
  const easing = 1 - Math.exp(-rawDelta * 8);
  camera.x = lerp(camera.x, targetX, easing);
  camera.y = lerp(camera.y, targetY, easing);
  recoil *= Math.exp(-rawDelta * 14);
  cameraShake *= Math.exp(-rawDelta * 12);
  lightning *= Math.exp(-rawDelta * 3.8);
  stageVisual = lerp(stageVisual, state.stage, 1 - Math.exp(-rawDelta * 1.8));
}

function gameLoop(now) {
  const rawDelta = clamp((now - lastFrame) / 1000, 0, 0.05);
  lastFrame = now;
  updateCamera(rawDelta);

  const flowActive = now < flowUntil;
  const worldActive = state.status === 'running' && !paused && !quizActive && !quizPending && !perkPending;
  const hitStopped = now < hitStopUntil;
  const timeScale = flowActive ? 0.58 : 1;
  const delta = worldActive && !hitStopped ? rawDelta * timeScale : 0;
  animationTime += rawDelta * (worldActive ? timeScale : 0.18);

  if (worldActive) {
    if (state.stage < STAGES.length) {
      spawnClock -= delta;
      const activeTargets = targets.filter((target) => !target.hit).length;
      if (spawnClock <= 0 && activeTargets < maxTargetsForStage(state.stage)) {
        spawnTarget();
        spawnClock = spawnIntervalForStage(state.stage);
      }
    }

    updateTargets(delta, now);
    updateEffects(rawDelta * (hitStopped ? 0.28 : 1));

    if (aim.hideAt && now > aim.hideAt) {
      aim.visible = false;
      aim.hideAt = 0;
      positionCrosshair();
    }
  } else {
    updateEffects(rawDelta * 0.2);
    for (const target of targets) updateTargetMesh(target);
  }

  if (confetti.length) updateConfetti(rawDelta);
  updateFlowPower(now);
  updateClock(Date.now());
  updateAimLock();
  render(now);
  requestAnimationFrame(gameLoop);
}

function debugStationaryTarget(kind = 'normal') {
  const finalStage = state.stage === STAGES.length;
  let target = finalStage ? targets.find((candidate) => candidate.kind === 'critical' && !candidate.hit) : null;
  if (!target) {
    target = spawnTarget({
      kind: finalStage ? 'critical' : kind,
      direction: 1,
      baseZ: finalStage ? 7.9 : 8.8,
      x: 0,
      y: 4.25,
      baseY: 4.25,
      speed: 0,
      amplitudeY: 0,
      amplitudeZ: 0,
    });
  }
  target.position.x = 0;
  target.position.y = 4.25;
  target.position.z = finalStage ? 7.9 : 8.8;
  target.baseY = 4.25;
  target.baseZ = target.position.z;
  target.speed = 0;
  target.amplitudeY = 0;
  target.amplitudeZ = 0;
  if (target.kind === 'critical') {
    finalTargetSpawned = true;
    target.entryX = 0;
    target.age = 1.6;
    target.criticalEntered = true;
  }
  updateTargetMesh(target);
  return target;
}

function debugHit(randomValue = 0.99, kind = 'normal') {
  if (state.status !== 'running' || paused || quizActive || quizPending || perkPending) return false;
  const target = debugStationaryTarget(kind);
  return resolvePlayerShot(target, target.screenCenter.x, target.screenCenter.y, randomValue);
}

function resultShareText() {
  const rank = performanceRank(state, selectedMissionIds);
  const accuracy = Math.round(accuracyPercent(state));
  const name = profile.name || 'En kollega';
  return `${name} fikk ${formatScore(state.score)} poeng, lukket ${state.casesSolved}/${TARGET_CASES} saker, traff ${accuracy} % og oppnådde rang ${rank.grade} – ${rank.title} i Brukerstøttejakten 4.0. Kan du slå resultatet?`;
}

async function copyText(text, button, successLabel) {
  try {
    await navigator.clipboard.writeText(text);
    const span = button?.querySelector('span');
    if (!span) return true;
    const original = span.textContent;
    span.textContent = successLabel;
    window.setTimeout(() => { span.textContent = original; }, 1500);
    return true;
  } catch {
    showMessage('Nettleseren tillot ikke kopiering.', true);
    return false;
  }
}

async function shareResult() {
  const text = resultShareText();
  const url = resultChallengeUrl || window.location.href.split('?')[0];
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Kollegaduell i Brukerstøttejakten 4.0', text, url });
      return;
    }
    await copyText(`${text}\n${url}`, ui.shareButton, 'Duell-lenke kopiert');
  } catch (error) {
    if (error?.name !== 'AbortError') showMessage('Resultatet kunne ikke deles.', true);
  }
}

async function copyResult() {
  const lines = [
    resultShareText(),
    `Resultatkode: ${resultEntry?.code || resultCode(runSeed, state.score, performanceRank(state, selectedMissionIds).grade)}`,
    window.location.href.split('?')[0],
  ];
  await copyText(lines.join('\n'), ui.copyButton, 'Resultat kopiert');
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
  audio.ensure();
  shoot(point.x, point.y);
});

canvas.addEventListener('pointerleave', () => {
  if (aim.pointerType === 'mouse') {
    aim.visible = false;
    positionCrosshair();
  }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (perkPending && (key === '1' || key === '2' || key === '3')) {
    event.preventDefault();
    const button = ui.perkOptions.querySelectorAll('.perk-option')[Number(key) - 1];
    if (button) choosePerk(button.dataset.perk);
    return;
  }

  if (quizActive && (key === '1' || key === '2')) {
    event.preventDefault();
    const option = Number(key) - 1;
    const button = ui.quizOptions.querySelector(`[data-option-index="${option}"]`);
    if (button && !button.disabled) answerQuiz(option);
    return;
  }

  if (key === 'p' && state.status === 'running' && !quizActive && !perkPending) {
    event.preventDefault();
    togglePause();
    return;
  }

  if (key === 'f' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    ui.fullscreenButton.click();
    return;
  }

  if (state.status !== 'running' || paused || quizActive || quizPending || perkPending) return;

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
    audio.ensure();
    aim.visible = true;
    positionCrosshair();
    shoot(aim.x, aim.y);
  }
});

ui.dailyModeButton.addEventListener('click', () => selectMode('daily'));
ui.randomModeButton.addEventListener('click', () => selectMode('random'));
ui.duelModeButton?.addEventListener('click', () => selectMode('duel'));
ui.playerName.addEventListener('change', () => {
  profile.name = sanitizeName(ui.playerName.value);
  ui.playerName.value = profile.name;
  writeProfile();
});
ui.startButton.addEventListener('click', startRound);
ui.restartButton.addEventListener('click', startRound);
ui.resumeButton.addEventListener('click', () => togglePause(false));
ui.pauseButton.addEventListener('click', () => togglePause());
ui.shareButton.addEventListener('click', shareResult);
ui.copyButton.addEventListener('click', copyResult);

ui.soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  audio.setEnabled(soundEnabled);
  ui.soundButton.setAttribute('aria-pressed', String(soundEnabled));
  ui.soundButton.querySelector('span').textContent = soundEnabled ? 'Lyd på' : 'Lyd av';
  ui.soundButton.querySelector('i').textContent = soundEnabled ? '◖' : '×';
  if (soundEnabled) audio.tone(440, 0.1, { type: 'triangle', gain: 0.024 });
});

ui.fullscreenButton.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await board.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showMessage('Fullskjerm støttes ikke i denne nettleseren.', true);
  }
});

document.addEventListener('fullscreenchange', () => {
  ui.fullscreenButton.querySelector('span').textContent = document.fullscreenElement ? 'Avslutt fullskjerm' : 'Fullskjerm';
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running' && !paused && !quizActive && !perkPending) togglePause(true);
});

window.addEventListener('resize', resizeCanvas, { passive: true });
new ResizeObserver(resizeCanvas).observe(board);

if (testMode) {
  window.__brukerstottejakten = {
    start: startRound,
    selectMode,
    hit: (randomValue = 0.99, kind = 'normal') => debugHit(randomValue, kind),
    miss: () => shoot(world.width * 0.06, world.height * 0.16, 0.99),
    answerCorrect: () => currentQuestion ? answerQuiz(currentQuestion.correct) : false,
    answerWrong: () => currentQuestion ? answerQuiz(currentQuestion.correct === 0 ? 1 : 0) : false,
    choosePerk: (index = 0) => {
      const button = ui.perkOptions.querySelectorAll('.perk-option')[index];
      if (button) choosePerk(button.dataset.perk);
      return Boolean(button);
    },
    pause: () => togglePause(true),
    resume: () => togglePause(false),
    expire: () => {
      if (state.status !== 'running') return false;
      roundEndsAt = Date.now() - 1;
      updateClock();
      return true;
    },
    setCases: (cases) => {
      const target = clamp(Math.round(cases), 0, TARGET_CASES);
      state = { ...state, casesSolved: target, stage: STAGES.findLast((stage) => target >= stage.from)?.id || 1 };
      updateHud();
      return { ...state };
    },
    spawnCritical: spawnCriticalTarget,
    getState: () => ({
      ...state,
      paused,
      quizActive,
      quizPending,
      perkPending,
      ownedPerks: [...ownedPerks],
      selectedMissionIds: [...selectedMissionIds],
      flowActive: performance.now() < flowUntil,
      remaining: roundRemainingSeconds(),
      targetCount: targets.filter((target) => !target.hit).length,
      finalTargetSpawned,
      resultFinalized,
    }),
  };
}

configureStartScreen();
createSceneSeeds(todaySeed);
renderLevelRail();
renderMissionList();
renderPerkStrip();
resizeCanvas();
ui.operationClock.textContent = formatClock(ROUND_SECONDS);
updateHud();
requestAnimationFrame(gameLoop);
