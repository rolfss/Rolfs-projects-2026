import {
  CASES_PER_LEVEL,
  FLOW_MAX,
  LEVELS,
  LEVEL_COUNT,
  QUEUE_MAX,
  TARGET_CASES,
  UPGRADE_DEFINITIONS,
  accuracyPercent,
  achievementCount,
  applyUpgrade,
  beginLevel,
  careerRank,
  careerXpForRun,
  clamp,
  createGameState,
  levelObjectiveComplete,
  levelProgressPercent,
  levelStars,
  performanceGrade,
  performanceScore,
  progressPercent,
  recordDecoyHit,
  recordEscape,
  recordQuizAnswer,
  recordQuizOffer,
  recordShot,
  shouldTriggerQuiz,
  startGame,
  unlockedAchievements,
  upgradeModifiers,
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
  dailyName: document.querySelector('#dailyName'),
  dailyCode: document.querySelector('#dailyCode'),
  dailyBriefName: document.querySelector('#dailyBriefName'),
  dailyBriefText: document.querySelector('#dailyBriefText'),
  dailyBriefCode: document.querySelector('#dailyBriefCode'),
  levelText: document.querySelector('#levelText'),
  levelName: document.querySelector('#levelName'),
  casesText: document.querySelector('#casesText'),
  levelCasesText: document.querySelector('#levelCasesText'),
  scoreText: document.querySelector('#scoreText'),
  pointsText: document.querySelector('#pointsText'),
  comboText: document.querySelector('#comboText'),
  comboCell: document.querySelector('#comboCell'),
  streakText: document.querySelector('#streakText'),
  timerText: document.querySelector('#timerText'),
  objectiveStatus: document.querySelector('#objectiveStatus'),
  objectiveTitle: document.querySelector('#objectiveTitle'),
  objectiveText: document.querySelector('#objectiveText'),
  objectiveFill: document.querySelector('#objectiveFill'),
  pressureHint: document.querySelector('#pressureHint'),
  pressureText: document.querySelector('#pressureText'),
  pressureFill: document.querySelector('#pressureFill'),
  achievementCount: document.querySelector('#achievementCount'),
  radarCount: document.querySelector('#radarCount'),
  radarBlips: document.querySelector('#radarBlips'),
  levelRail: document.querySelector('#levelRail'),
  railFill: document.querySelector('#railFill'),
  flowHint: document.querySelector('#flowHint'),
  flowText: document.querySelector('#flowText'),
  flowFill: document.querySelector('#flowFill'),
  flowTrack: document.querySelector('.flow-track'),
  upgradeDots: document.querySelector('#upgradeDots'),
  campaignPercent: document.querySelector('#campaignPercent'),
  campaignTrack: document.querySelector('#campaignTrack'),
  campaignFill: document.querySelector('#campaignFill'),
  remainingText: document.querySelector('#remainingText'),
  recordText: document.querySelector('#recordText'),
  powerupCard: document.querySelector('#powerupCard'),
  powerupTimer: document.querySelector('#powerupTimer'),
  statusMessage: document.querySelector('#statusMessage'),
  scorePop: document.querySelector('#scorePop'),
  levelBanner: document.querySelector('#levelBanner'),
  levelBannerNumber: document.querySelector('#levelBannerNumber'),
  levelBannerName: document.querySelector('#levelBannerName'),
  levelBannerText: document.querySelector('#levelBannerText'),
  bossBanner: document.querySelector('#bossBanner'),
  reticle: document.querySelector('#reticle'),
  reticleLabel: document.querySelector('#reticleLabel'),
  weaponRig: document.querySelector('#weaponRig'),
  gunMode: document.querySelector('#gunMode'),
  gunLevel: document.querySelector('#gunLevel'),
  weaponStatus: document.querySelector('#weaponStatus'),
  fxLayer: document.querySelector('#fxLayer'),
  startOverlay: document.querySelector('#startOverlay'),
  startButton: document.querySelector('#startButton'),
  careerRank: document.querySelector('#careerRank'),
  careerXp: document.querySelector('#careerXp'),
  careerRuns: document.querySelector('#careerRuns'),
  careerFill: document.querySelector('#careerFill'),
  quizOverlay: document.querySelector('#quizOverlay'),
  quizNumber: document.querySelector('#quizNumber'),
  quizTitle: document.querySelector('#quizTitle'),
  quizOptions: document.querySelector('#quizOptions'),
  quizFeedback: document.querySelector('#quizFeedback'),
  intermissionOverlay: document.querySelector('#intermissionOverlay'),
  completedLevelLabel: document.querySelector('#completedLevelLabel'),
  levelStars: document.querySelector('#levelStars'),
  intermissionTitle: document.querySelector('#intermissionTitle'),
  intermissionSummary: document.querySelector('#intermissionSummary'),
  levelResultTime: document.querySelector('#levelResultTime'),
  levelResultAccuracy: document.querySelector('#levelResultAccuracy'),
  levelResultCombo: document.querySelector('#levelResultCombo'),
  levelResultObjective: document.querySelector('#levelResultObjective'),
  upgradeOptions: document.querySelector('#upgradeOptions'),
  continueButton: document.querySelector('#continueButton'),
  pauseOverlay: document.querySelector('#pauseOverlay'),
  resumeButton: document.querySelector('#resumeButton'),
  winOverlay: document.querySelector('#winOverlay'),
  restartButton: document.querySelector('#restartButton'),
  shareButton: document.querySelector('#shareButton'),
  shareStatus: document.querySelector('#shareStatus'),
  gradeMedallion: document.querySelector('#gradeMedallion'),
  gradeText: document.querySelector('#gradeText'),
  winSummary: document.querySelector('#winSummary'),
  resultTitle: document.querySelector('#resultTitle'),
  resultPerformance: document.querySelector('#resultPerformance'),
  resultScore: document.querySelector('#resultScore'),
  resultRecord: document.querySelector('#resultRecord'),
  resultTime: document.querySelector('#resultTime'),
  resultAccuracy: document.querySelector('#resultAccuracy'),
  resultCombo: document.querySelector('#resultCombo'),
  resultQuiz: document.querySelector('#resultQuiz'),
  resultEscalations: document.querySelector('#resultEscalations'),
  resultFlow: document.querySelector('#resultFlow'),
  resultAchievementCount: document.querySelector('#resultAchievementCount'),
  badgeRow: document.querySelector('#badgeRow'),
  resultCareerRank: document.querySelector('#resultCareerRank'),
  resultCareerXp: document.querySelector('#resultCareerXp'),
  resultCareerTotal: document.querySelector('#resultCareerTotal'),
  resultCareerFill: document.querySelector('#resultCareerFill'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const testMode = new URLSearchParams(window.location.search).has('test');
const renderer = new SceneRenderer(canvas, { reducedMotion });
ui.graphicsText.textContent = renderer.info.label;

const LEVEL_CONFIG = [
  { maxTargets: 2, speed: 2.15, interval: [1.24, 1.62], weights: { normal: 1 } },
  { maxTargets: 2, speed: 2.38, interval: [1.1, 1.48], weights: { normal: .82, priority: .18 } },
  { maxTargets: 3, speed: 2.58, interval: [.98, 1.35], weights: { normal: .48, priority: .42, legacy: .1 } },
  { maxTargets: 3, speed: 2.65, interval: [.92, 1.28], weights: { normal: .42, shield: .43, priority: .15 } },
  { maxTargets: 3, speed: 2.72, interval: [.86, 1.2], weights: { normal: .38, duplicate: .27, priority: .2, shield: .15 } },
  { maxTargets: 3, speed: 2.82, interval: [.82, 1.14], weights: { legacy: .42, normal: .28, duplicate: .14, shield: .16 } },
  { maxTargets: 4, speed: 2.98, interval: [.72, 1.04], weights: { normal: .28, priority: .27, shield: .2, legacy: .15, duplicate: .1 } },
  { maxTargets: 4, speed: 3.18, interval: [.66, .96], weights: { critical: .4, priority: .25, normal: .17, shield: .1, duplicate: .08 } },
  { maxTargets: 4, speed: 3.28, interval: [.62, .92], weights: { critical: .28, shield: .24, legacy: .2, priority: .18, duplicate: .1 } },
  { maxTargets: 4, speed: 3.38, interval: [.58, .86], weights: { critical: .34, shield: .24, priority: .2, legacy: .14, duplicate: .08 } },
];

const ACHIEVEMENT_LABELS = {
  onboarding: 'Pålogget',
  combo: 'Ti på rad',
  sla: 'SLA-redder',
  shieldbreaker: 'Skjermingsbryter',
  noark: 'Noark-klar',
  precision: 'Kirurgisk presisjon',
  calm: 'Kaldt hode',
  major: 'Hovedhendelsen',
};

const POSITIVE_MESSAGES = [
  'Sak løst. Køen puster lettere.',
  'Dokumentert. Verifisert. Lukket.',
  'Riktig kø. Riktig tiltak.',
  'SLA-en overlevde.',
  'Saksflyt i verdensklasse.',
  'Førstelinjen sender stille applaus.',
  'Ingen restanse her.',
  'Løst før neste statusmøte.',
];

const NOARK_QUESTIONS = [
  { question: 'Hva er Noark 5?', options: ['En standard for elektronisk arkivdanning', 'Et program for videomøter'], correct: 0, explanation: 'Noark 5 beskriver krav til arkivstruktur, metadata og funksjonalitet for elektronisk arkivdanning.' },
  { question: 'Skal metadata bidra til at dokumentasjon kan finnes og forstås?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Metadata bevarer sammenheng og gjør dokumentasjon søkbar og forståelig over tid.' },
  { question: 'Kan et fagsystem integreres med en Noark 5-kjerne?', options: ['Ja', 'Nei'], correct: 0, explanation: 'En Noark-kjerne kan motta og forvalte arkivinformasjon fra ett eller flere fagsystemer.' },
  { question: 'Er en journalpost og et dokument alltid det samme?', options: ['Nei', 'Ja'], correct: 0, explanation: 'En journalpost er en registrering og kan være knyttet til hoveddokument og vedlegg.' },
  { question: 'Betyr bevaring og kassasjon det samme?', options: ['Nei', 'Ja'], correct: 0, explanation: 'Bevaring betyr at materialet skal tas vare på. Kassasjon betyr at det kan destrueres etter regler.' },
  { question: 'Kan tilgang og skjerming styres med registrerte opplysninger?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Tilgangskoder, autorisasjon og skjermingsopplysninger kan styre hva ulike brukere får se.' },
  { question: 'Kan en journalpost ha både hoveddokument og vedlegg?', options: ['Ja', 'Nei'], correct: 0, explanation: 'En journalpost kan være knyttet til ett hoveddokument og ett eller flere vedlegg.' },
  { question: 'Er Noark 5 bare ett bestemt filformat?', options: ['Nei', 'Ja'], correct: 0, explanation: 'Noark 5 er en kravstandard for arkivdanning, ikke bare et filformat.' },
  { question: 'Bør dokumentets kontekst bevares sammen med dokumentasjonen?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Kontekst og metadata gjør det mulig å forstå hvem som skapte dokumentasjonen, hvorfor og i hvilken sammenheng.' },
  { question: 'Kan arkivuttrekk brukes for langtidsbevaring utenfor originalsystemet?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Et strukturert arkivuttrekk gjør arkivinformasjon mindre avhengig av originalsystemet.' },
  { question: 'Er en klassifikasjon en måte å ordne dokumentasjon etter funksjon eller emne?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Klassifikasjon gir en systematisk struktur som viser dokumentasjonens tilhørighet og kontekst.' },
  { question: 'Kan samme dokument registreres uten noen metadata og fortsatt være godt arkivert?', options: ['Nei', 'Ja'], correct: 0, explanation: 'Uten nødvendige metadata går søkbarhet, autentisitet og kontekst lett tapt.' },
  { question: 'Skal spor etter viktige endringer kunne dokumenteres?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Sporbarhet er viktig for å vise hva som er gjort, av hvem og når.' },
  { question: 'Er skjerming det samme som å slette dokumentasjonen?', options: ['Nei', 'Ja'], correct: 0, explanation: 'Skjerming begrenser innsyn eller visning. Dokumentasjonen kan fortsatt være bevart.' },
  { question: 'Kan dokumentfangst skje automatisk fra en arbeidsprosess?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Automatisert dokumentfangst kan redusere manuelt arbeid og sikre tidligere registrering.' },
  { question: 'Er arkivansvar bare relevant når et system skal avvikles?', options: ['Nei', 'Ja'], correct: 0, explanation: 'Arkivhensyn bør bygges inn gjennom hele systemets og dokumentasjonens livsløp.' },
  { question: 'Kan identifikatorer bidra til entydig gjenfinning?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Entydige identifikatorer gjør det lettere å referere til og gjenfinne riktig registrering.' },
  { question: 'Bør kassasjon skje etter fastsatte regler?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Kassasjon skal bygge på gyldige bestemmelser, ikke tilfeldige valg.' },
  { question: 'Kan en Noark-løsning bestå av en kjerne og separate fagsystemer?', options: ['Ja', 'Nei'], correct: 0, explanation: 'En Noark-kjerne kan tilby arkivfunksjonalitet til flere integrerte arbeids- og fagsystemer.' },
  { question: 'Er god arkivering også et spørsmål om pålitelig dokumentasjon?', options: ['Ja', 'Nei'], correct: 0, explanation: 'Arkivdanning skal støtte dokumentasjonens autentisitet, integritet, pålitelighet og anvendelighet.' },
];

const DAILY_MODIFIERS = [
  { name: 'Høy trafikk', description: 'Flere saker kommer samtidig, men hver løste sak gir 10 % mer arkadepoeng.', spawnScale: .9, scoreScale: 1.1, speedScale: 1, pressureScale: 1, priorityBoost: 0, legacyBoost: 0 },
  { name: 'SLA-dag', description: 'Flere prioritetssaker dukker opp. De gir også 15 % ekstra arkadepoeng.', spawnScale: 1, scoreScale: 1, speedScale: 1, pressureScale: 1, priorityBoost: .13, legacyBoost: 0, priorityScoreScale: 1.15 },
  { name: 'Migreringsvakt', description: 'Flere eldre saker følger uforutsigbare baner. Saksflyt bygges 10 % raskere.', spawnScale: 1, scoreScale: 1, speedScale: 1, pressureScale: 1, priorityBoost: 0, legacyBoost: .16, flowScale: 1.1 },
  { name: 'Kontrollert drift', description: 'Sakene er litt roligere, og eskaleringer gir mindre køtrykk.', spawnScale: 1.04, scoreScale: 1, speedScale: .95, pressureScale: .78, priorityBoost: 0, legacyBoost: 0 },
];

function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDailyChallenge() {
  const key = todayKey();
  const hash = hashString(key);
  const modifier = DAILY_MODIFIERS[hash % DAILY_MODIFIERS.length];
  return { ...modifier, key, code: `KAFFE-${String(hash % 1000).padStart(3, '0')}` };
}

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.ambientTimer = 0;
    this.ambientStep = 0;
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
    this.compressor.threshold.value = -21;
    this.compressor.knee.value = 15;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = .004;
    this.compressor.release.value = .2;
    this.master = this.context.createGain();
    this.master.gain.value = .72;
    this.compressor.connect(this.master);
    this.master.connect(this.context.destination);
    return this.context;
  }

  tone(frequency, duration, { type = 'sine', gain = .024, delay = 0, endFrequency = null, pan = 0 } = {}) {
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
    volume.gain.exponentialRampToValueAtTime(gain, start + Math.min(.014, duration * .22));
    volume.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(volume);
    if (panner) {
      panner.pan.value = clamp(pan, -1, 1);
      volume.connect(panner);
      panner.connect(this.compressor);
    } else volume.connect(this.compressor);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  }

  noise(duration = .075, gain = .022, frequency = 950) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context) return;
    const count = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, count, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < count; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / count);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
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
    if (!this.enabled || this.ambientTimer) return;
    this.ensure();
    const notes = [82.41, 110, 123.47, 146.83, 110, 138.59, 164.81, 123.47];
    const tick = () => {
      if (!this.enabled || state.status !== 'running' || paused || quizActive || intermissionActive) return;
      const note = notes[this.ambientStep % notes.length];
      this.tone(note, .58, { type: 'triangle', gain: .0048 });
      if (this.ambientStep % 2 === 0) this.tone(note * 2, .22, { type: 'sine', gain: .0028, delay: .08 });
      this.ambientStep += 1;
    };
    tick();
    this.ambientTimer = window.setInterval(tick, 560);
  }

  stopAmbient() {
    if (this.ambientTimer) window.clearInterval(this.ambientTimer);
    this.ambientTimer = 0;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.stopAmbient();
      if (this.master && this.context) this.master.gain.setTargetAtTime(.0001, this.context.currentTime, .03);
    } else {
      this.ensure();
      if (this.master && this.context) this.master.gain.setTargetAtTime(.72, this.context.currentTime, .03);
      this.startAmbient();
      this.tone(440, .09, { type: 'triangle', gain: .018 });
    }
  }

  start() { [196, 293.66, 392, 523.25].forEach((f, i) => this.tone(f, .12, { type: i % 2 ? 'triangle' : 'square', gain: .019, delay: i * .07 })); this.startAmbient(); }
  shot() { this.noise(.07, .025, 1100); this.tone(142, .085, { type: 'sawtooth', gain: .044, endFrequency: 49 }); this.tone(61, .12, { type: 'square', gain: .019, endFrequency: 29 }); }
  hit(streak, pan = 0, armored = false) { this.tone(armored ? 260 : 420 + Math.min(streak, 12) * 22, .1, { type: armored ? 'sawtooth' : 'square', gain: .022, endFrequency: armored ? 170 : 760, pan }); this.tone(armorTone(armored), .075, { type: 'triangle', gain: .012, delay: .05, pan }); }
  miss() { this.tone(118, .11, { type: 'triangle', gain: .016, endFrequency: 76 }); }
  decoy() { this.tone(220, .15, { type: 'sawtooth', gain: .021, endFrequency: 86 }); this.tone(73, .2, { type: 'square', gain: .015, delay: .11, endFrequency: 42 }); }
  escape() { this.tone(190, .13, { type: 'square', gain: .019, endFrequency: 112 }); this.tone(112, .17, { type: 'square', gain: .014, delay: .1, endFrequency: 62 }); }
  combo(streak) { const base = 300 + streak * 15; [base, base * 1.25, base * 1.5].forEach((f, i) => this.tone(f, .095, { type: 'triangle', gain: .018, delay: i * .05 })); }
  level() { [220, 330, 440, 660, 880].forEach((f, i) => this.tone(f, .12, { type: i % 2 ? 'triangle' : 'square', gain: .019, delay: i * .06 })); }
  upgrade() { [392, 523.25, 783.99].forEach((f, i) => this.tone(f, .16, { type: 'triangle', gain: .02, delay: i * .08 })); }
  flow() { [293.66, 440, 587.33, 880].forEach((f, i) => this.tone(f, .2, { type: 'sine', gain: .021, delay: i * .06 })); }
  overload() { this.tone(95, .6, { type: 'sawtooth', gain: .025, endFrequency: 54 }); this.tone(142, .42, { type: 'square', gain: .018, delay: .14, endFrequency: 86 }); }
  quizOpen() { this.tone(261.63, .12, { type: 'sine', gain: .018 }); this.tone(392, .14, { type: 'sine', gain: .016, delay: .08 }); }
  quizCorrect() { [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, .15, { type: 'triangle', gain: .021, delay: i * .07 })); }
  quizWrong() { this.tone(235, .19, { type: 'sawtooth', gain: .02, endFrequency: 110 }); this.tone(105, .22, { type: 'square', gain: .014, delay: .13, endFrequency: 62 }); }
  boss() { this.tone(65.41, .72, { type: 'sawtooth', gain: .026, endFrequency: 41 }); this.tone(98, .5, { type: 'square', gain: .019, delay: .17, endFrequency: 73 }); this.tone(164.81, .34, { type: 'triangle', gain: .017, delay: .55, endFrequency: 246.94 }); }
  win() { const melody = [392, 523.25, 659.25, 783.99, 659.25, 783.99, 987.77, 1174.66]; melody.forEach((f, i) => this.tone(f, i === melody.length - 1 ? .55 : .17, { type: i % 2 ? 'triangle' : 'square', gain: .022, delay: i * .1 })); }
}

function armorTone(armored) { return armored ? 510 : 820; }

const sound = new SoundEngine();
const daily = createDailyChallenge();
let state = createGameState();
let targets = [];
let targetId = 1;
let spawnClock = 0;
let lastFrame = performance.now();
let sceneTime = 0;
let activeElapsedMs = 0;
let levelActiveStartMs = 0;
let paused = false;
let quizActive = false;
let quizPending = false;
let intermissionActive = false;
let intermissionPending = false;
let pendingWin = false;
let currentQuestion = null;
let questionDeck = [];
let questionIndex = 0;
let selectedUpgrade = null;
let upgradeChoices = [];
let flowUntil = 0;
let overloadUntil = 0;
let finaleAnnounced = false;
let statusTimer = 0;
let overlayTimer = 0;
let levelTimer = 0;
let quizTimer = 0;
let intermissionTimer = 0;
let winTimer = 0;
let roundToken = 0;
let lastAchievementCount = 0;
let highRecord = readRecord();
let career = readCareer();
let finalSnapshot = null;
let levelKindSpawns = {};

const aim = { x: 0, y: 0, visible: false, pointerType: 'keyboard', hideAt: 0 };

function randomBetween(min, max) { return min + Math.random() * (max - min); }

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function readRecord() {
  try {
    const value = JSON.parse(window.localStorage.getItem('brukerstottejakten-v4-record') || 'null');
    return value && Number.isFinite(value.score) ? value : null;
  } catch { return null; }
}

function writeRecord(value) {
  try { window.localStorage.setItem('brukerstottejakten-v4-record', JSON.stringify(value)); } catch { /* optional */ }
}

function readCareer() {
  try {
    const value = JSON.parse(window.localStorage.getItem('brukerstottejakten-v4-career') || 'null');
    if (value && Number.isFinite(value.xp)) return { xp: value.xp, runs: value.runs || 0, bestScore: value.bestScore || 0 };
  } catch { /* optional */ }
  return { xp: 0, runs: 0, bestScore: 0 };
}

function writeCareer(value) {
  try { window.localStorage.setItem('brukerstottejakten-v4-career', JSON.stringify(value)); } catch { /* optional */ }
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
  }, testMode ? 10 : 220);
}

function showMessage(text, bad = false, duration = 900) {
  window.clearTimeout(statusTimer);
  ui.statusMessage.textContent = text;
  ui.statusMessage.classList.toggle('is-bad', bad);
  ui.statusMessage.classList.add('is-visible');
  statusTimer = window.setTimeout(() => ui.statusMessage.classList.remove('is-visible'), testMode ? 30 : duration);
}

function showScorePop(text, x = aim.x, y = aim.y, bad = false) {
  ui.scorePop.textContent = text;
  ui.scorePop.style.left = `${clamp(x, 55, renderer.width - 55)}px`;
  ui.scorePop.style.top = `${clamp(y, 78, renderer.height - 90)}px`;
  ui.scorePop.style.color = bad ? 'var(--danger)' : 'var(--gold)';
  ui.scorePop.classList.remove('is-popping');
  void ui.scorePop.offsetWidth;
  ui.scorePop.classList.add('is-popping');
}

function showImpact(x, y, bad = false) {
  const ring = document.createElement('span');
  ring.className = 'impact-ring';
  ring.style.setProperty('--gold', bad ? '#ff5f68' : '#ffd66b');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ui.fxLayer.append(ring);
  window.setTimeout(() => ring.remove(), 700);
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function resultState() {
  return {
    ...state,
    startedAt: 1,
    finishedAt: Math.max(2, Math.round(activeElapsedMs) + 1),
  };
}

function careerProgress(totalXp) {
  const rank = careerRank(totalXp);
  const thresholds = [0, 700, 1_700, 3_200, 5_200, 7_800, 11_000, 15_000];
  const current = thresholds[Math.min(rank.level - 1, thresholds.length - 2)];
  const next = thresholds[Math.min(rank.level, thresholds.length - 1)];
  return { rank, percent: clamp(((totalXp - current) / Math.max(1, next - current)) * 100, 0, 100) };
}

function updateStartMeta() {
  ui.dailyName.textContent = daily.name;
  ui.dailyCode.textContent = daily.code;
  ui.dailyBriefName.textContent = daily.name;
  ui.dailyBriefText.textContent = daily.description;
  ui.dailyBriefCode.textContent = daily.code;
  const progress = careerProgress(career.xp);
  ui.careerRank.textContent = progress.rank.name;
  ui.careerXp.textContent = `${career.xp.toLocaleString('nb-NO')} XP`;
  ui.careerRuns.textContent = `${career.runs} fullførte vakter`;
  ui.careerFill.style.width = `${progress.percent}%`;
}

function objectiveProgress() {
  switch (state.level) {
    case 1: return { current: state.levelCases, target: CASES_PER_LEVEL };
    case 2: return { current: Math.min(state.bestStreak, 5), target: 5 };
    case 3: return { current: Math.min(state.levelPriorityHits, 3), target: 3 };
    case 4: return { current: Math.min(state.levelShieldBreaks, 2), target: 2 };
    case 5: return { current: state.levelDecoysHit === 0 ? state.levelCases : 0, target: CASES_PER_LEVEL };
    case 6: return { current: Math.min(state.levelLegacyHits, 3), target: 3 };
    case 7: return { current: Math.max(0, 80 - state.levelPeakPressure), target: 80 };
    case 8: return { current: Math.min(state.levelCriticalHits, 3), target: 3 };
    case 9: return { current: Math.min(accuracyPercent(state), 75), target: 75 };
    case 10: return { current: state.majorResolved ? 1 : Math.min(state.levelCases / 8, .88), target: 1 };
    default: return { current: 0, target: 1 };
  }
}

function updateHud(now = performance.now()) {
  const level = LEVELS[state.level - 1];
  const totalPercent = Math.round(progressPercent(state.casesSolved));
  const levelPercent = Math.round(levelProgressPercent(state.casesSolved));
  const remaining = Math.max(0, TARGET_CASES - state.casesSolved);
  const flowActive = now < flowUntil;
  const overloadActive = now < overloadUntil;
  const active = state.status === 'running' && !paused && !quizActive && !quizPending && !intermissionActive && !intermissionPending && !pendingWin;
  const objective = objectiveProgress();
  const objectivePercent = clamp((objective.current / Math.max(1, objective.target)) * 100, 0, 100);

  ui.levelText.textContent = String(state.level).padStart(2, '0');
  ui.levelName.textContent = level.name;
  ui.levelCasesText.textContent = `${state.levelCases}/${CASES_PER_LEVEL} i nivået`;
  ui.casesText.innerHTML = `${state.casesSolved}<span>/${TARGET_CASES}</span>`;
  ui.scoreText.textContent = state.score.toLocaleString('nb-NO');
  ui.pointsText.textContent = `${state.points} prestasjonspoeng`;
  ui.comboText.textContent = `x${state.multiplier.toFixed(2).replace('.', ',')}`;
  ui.streakText.textContent = `${state.streak} treff`;
  ui.timerText.textContent = formatTime(activeElapsedMs);
  ui.objectiveTitle.textContent = level.mechanic;
  ui.objectiveText.textContent = level.objective;
  ui.objectiveStatus.textContent = levelObjectiveComplete(state, state.level) ? 'FULLFØRT' : `${Math.floor(objective.current)}/${objective.target}`;
  ui.objectiveFill.style.width = `${objectivePercent}%`;
  ui.pressureText.textContent = `${Math.round(state.queuePressure)} %`;
  ui.pressureFill.style.width = `${state.queuePressure}%`;
  ui.pressureHint.textContent = state.queuePressure >= 80 ? 'Kritisk' : state.queuePressure >= 55 ? 'Presset' : state.queuePressure >= 25 ? 'Økende' : 'Stabilt';
  ui.achievementCount.textContent = `${achievementCount(state)}/8`;
  ui.flowText.textContent = `${Math.round(state.flow)} %`;
  ui.flowFill.style.width = `${state.flow}%`;
  ui.flowHint.textContent = flowActive ? 'Dobbelt poeng og sakte film' : 'Bygges av presise treff';
  ui.flowTrack.classList.toggle('is-ready', state.flow >= 82 && !flowActive);
  ui.campaignPercent.textContent = `${totalPercent} %`;
  ui.campaignFill.style.width = `${totalPercent}%`;
  ui.campaignTrack.setAttribute('aria-valuenow', String(state.casesSolved));
  ui.remainingText.textContent = String(remaining);
  ui.recordText.textContent = highRecord ? `Rekord: ${highRecord.score.toLocaleString('nb-NO')}` : 'Rekord: —';
  ui.railFill.style.width = `${clamp(((state.level - 1 + levelPercent / 100) / (LEVEL_COUNT - 1)) * 100, 0, 100)}%`;

  [...ui.levelRail.children].forEach((item, index) => {
    const itemLevel = index + 1;
    item.classList.toggle('is-complete', itemLevel < state.level || state.status === 'won');
    item.classList.toggle('is-active', itemLevel === state.level && state.status !== 'won');
  });

  const achievementTotal = achievementCount(state);
  if (achievementTotal > lastAchievementCount && state.status === 'running') {
    const unlocked = unlockedAchievements(state);
    const latest = Object.keys(unlocked).find((key) => unlocked[key] && !ui.upgradeDots.querySelector(`[data-achievement="${key}"]`));
    if (latest) {
      const dot = document.createElement('i');
      dot.dataset.achievement = latest;
      dot.title = ACHIEVEMENT_LABELS[latest];
      ui.upgradeDots.append(dot);
      showMessage(`Utmerkelse: ${ACHIEVEMENT_LABELS[latest]}`);
      sound.upgrade();
    }
  }
  lastAchievementCount = achievementTotal;

  ui.upgradeDots.replaceChildren(...state.upgrades.map((upgradeId) => {
    const dot = document.createElement('i');
    dot.title = UPGRADE_DEFINITIONS[upgradeId]?.name || upgradeId;
    return dot;
  }));

  let duty = 'Frakoblet';
  if (state.status === 'won') duty = 'Fullført';
  else if (intermissionActive || intermissionPending) duty = 'Nivåskifte';
  else if (quizActive || quizPending) duty = 'Fagtest';
  else if (paused) duty = 'Pause';
  else if (state.status === 'running') duty = 'Pålogget';
  ui.dutyStatus.textContent = duty;
  ui.connectionPill.classList.toggle('is-online', active);
  ui.connectionPill.classList.toggle('is-paused', paused || quizActive || quizPending || intermissionActive || intermissionPending);
  ui.connectionPill.classList.toggle('is-complete', state.status === 'won');
  ui.pauseButton.disabled = state.status !== 'running' || quizActive || quizPending || intermissionActive || intermissionPending || pendingWin;
  ui.pauseButton.setAttribute('aria-pressed', String(paused));
  ui.pauseButton.querySelector('b').textContent = paused ? 'Fortsett' : 'Pause';

  ui.powerupCard.classList.toggle('is-active', flowActive);
  ui.powerupTimer.textContent = `${Math.max(0, (flowUntil - now) / 1000).toFixed(1).replace('.', ',')} s`;
  board.classList.toggle('is-flow', flowActive);
  board.classList.toggle('is-overload', overloadActive);
  renderer.setSlowMode(flowActive);
  renderer.setOverload(overloadActive);
  ui.weaponRig.classList.toggle('is-flow', flowActive);
  ui.weaponRig.classList.toggle('is-overload', overloadActive);
  ui.weaponRig.classList.toggle('is-upgraded', state.upgrades.length > 0);
  ui.weaponRig.className = ui.weaponRig.className.replace(/\bmodule-\d+\b/g, '').trim();
  ui.weaponRig.classList.add(`module-${Math.min(9, state.upgrades.length)}`);
  ui.gunMode.textContent = flowActive ? 'SAKSFLYT // 2X' : overloadActive ? 'OVERLAST // KJØL' : quizActive || quizPending ? 'FAGTEST // LÅST' : active ? 'SØKEMODUS' : 'SYSTEM HVILER';
  ui.gunLevel.textContent = `L${String(state.level).padStart(2, '0')}`;
  ui.weaponStatus.textContent = active ? 'Klar' : state.status === 'won' ? 'Fullført' : quizActive || quizPending ? 'Låst' : paused ? 'Pause' : intermissionActive || intermissionPending ? 'Oppgradering' : 'Klar';
}

function updateRadar() {
  const activeTargets = targets.filter((target) => !target.dead && !target.resolving);
  ui.radarCount.textContent = String(activeTargets.length);
  const fragment = document.createDocumentFragment();
  for (const target of activeTargets.slice(0, 12)) {
    const blip = document.createElement('span');
    blip.className = `radar-blip ${target.kind}`;
    const xRange = 14 * renderer.aspect + 6;
    blip.style.left = `${clamp(50 + (target.x / xRange) * 44, 6, 94)}%`;
    blip.style.top = `${clamp(84 - ((Math.abs(target.z) - 5) / 17) * 72, 8, 88)}%`;
    fragment.append(blip);
  }
  ui.radarBlips.replaceChildren(fragment);
}

function showLevelBanner(levelNumber) {
  const level = LEVELS[levelNumber - 1];
  ui.levelBannerNumber.textContent = `NIVÅ ${String(levelNumber).padStart(2, '0')}`;
  ui.levelBannerName.textContent = level.name;
  ui.levelBannerText.textContent = level.subtitle;
  ui.levelBanner.classList.remove('is-visible');
  void ui.levelBanner.offsetWidth;
  ui.levelBanner.classList.add('is-visible');
  window.clearTimeout(levelTimer);
  levelTimer = window.setTimeout(() => ui.levelBanner.classList.remove('is-visible'), testMode ? 40 : 2_250);
  renderer.pulseLevel();
  sound.level();
}

function showBossBanner() {
  ui.bossBanner.classList.remove('is-visible');
  void ui.bossBanner.offsetWidth;
  ui.bossBanner.classList.add('is-visible');
  window.setTimeout(() => ui.bossBanner.classList.remove('is-visible'), testMode ? 50 : 3_250);
  sound.boss();
}

function resize() {
  renderer.resize();
  if (!aim.x && !aim.y) {
    aim.x = renderer.width / 2;
    aim.y = renderer.height * .43;
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
  aim.hideAt = pointerType === 'touch' ? performance.now() + 470 : 0;
  renderer.setAim(aim.x, aim.y);
  ui.reticle.style.left = `${aim.x}px`;
  ui.reticle.style.top = `${aim.y}px`;
  const yaw = (aim.x / Math.max(renderer.width, 1) - .5) * 9;
  const pitch = (aim.y / Math.max(renderer.height, 1) - .5) * -6;
  ui.weaponRig.style.setProperty('--gun-yaw', `${yaw.toFixed(2)}deg`);
  ui.weaponRig.style.setProperty('--gun-pitch', `${pitch.toFixed(2)}deg`);
  updateReticle();
}

function updateReticle() {
  const active = state.status === 'running' && !paused && !quizActive && !quizPending && !intermissionActive && !intermissionPending && !pendingWin;
  ui.reticle.classList.toggle('is-visible', aim.visible && active);
  if (!active) return;
  const target = renderer.hitTest(targets, aim.x, aim.y, upgradeModifiers(state).hitboxScale);
  ui.reticle.classList.toggle('is-locked', Boolean(target && target.kind !== 'duplicate'));
  ui.reticle.classList.toggle('is-danger', target?.kind === 'duplicate');
  ui.reticleLabel.textContent = !target ? 'SØK' : target.kind === 'duplicate' ? 'IKKE SKYT' : target.kind === 'major' ? 'P1 LÅST' : 'MÅL LÅST';
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * renderer.width,
    y: ((event.clientY - rect.top) / Math.max(rect.height, 1)) * renderer.height,
  };
}

function triggerWeaponFire() {
  ui.weaponRig.classList.remove('is-firing');
  ui.reticle.classList.remove('is-firing');
  void ui.weaponRig.offsetWidth;
  ui.weaponRig.classList.add('is-firing');
  ui.reticle.classList.add('is-firing');
  window.setTimeout(() => {
    ui.weaponRig.classList.remove('is-firing');
    ui.reticle.classList.remove('is-firing');
  }, 230);
}

function levelConfig() { return LEVEL_CONFIG[state.level - 1]; }

function weightedKind(weights) {
  const entries = Object.entries(weights).map(([kind, weight]) => [kind, weight]);
  if (daily.priorityBoost && state.level >= 2) {
    const found = entries.find(([kind]) => kind === 'priority');
    if (found) found[1] += daily.priorityBoost;
    else entries.push(['priority', daily.priorityBoost]);
  }
  if (daily.legacyBoost && state.level >= 3) {
    const found = entries.find(([kind]) => kind === 'legacy');
    if (found) found[1] += daily.legacyBoost;
    else entries.push(['legacy', daily.legacyBoost]);
  }

  const remaining = CASES_PER_LEVEL - state.levelCases;
  const activeKinds = targets.filter((target) => !target.dead && !target.resolving).map((target) => target.kind);
  if (state.level === 3 && state.levelPriorityHits + activeKinds.filter((kind) => kind === 'priority').length < 3 && remaining <= 4) return 'priority';
  if (state.level === 4 && state.levelShieldBreaks + activeKinds.filter((kind) => kind === 'shield').length < 2 && remaining <= 3) return 'shield';
  if (state.level === 6 && state.levelLegacyHits + activeKinds.filter((kind) => kind === 'legacy').length < 3 && remaining <= 4) return 'legacy';
  if (state.level === 8 && state.levelCriticalHits + activeKinds.filter((kind) => kind === 'critical').length < 3 && remaining <= 4) return 'critical';

  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  let roll = Math.random() * total;
  for (const [kind, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return kind;
  }
  return entries[0]?.[0] || 'normal';
}

function targetHealth(kind) {
  const modifiers = upgradeModifiers(state);
  if (kind === 'major') return 8;
  if (kind === 'critical') return Math.max(1, 2 - modifiers.shieldDamageBonus);
  if (kind === 'shield') return Math.max(1, 2 - modifiers.shieldDamageBonus);
  return 1;
}

function spawnTarget(overrides = {}) {
  const config = levelConfig();
  const majorDue = state.level === LEVEL_COUNT && state.levelCases >= CASES_PER_LEVEL - 1;
  if (majorDue && targets.some((target) => target.kind === 'major' && !target.dead)) return null;
  if (majorDue && !finaleAnnounced) {
    finaleAnnounced = true;
    showBossBanner();
  }

  const kind = overrides.kind || (majorDue ? 'major' : weightedKind(config.weights));
  const direction = overrides.direction ?? (Math.random() < .5 ? 1 : -1);
  const xLimit = 12.5 + renderer.aspect * 2.6;
  const z = overrides.z ?? (kind === 'major' ? -4.8 : randomBetween(-13.5, -6.2));
  const depthFactor = clamp((Math.abs(z) - 6) / 9, 0, 1);
  const width = overrides.width ?? (kind === 'major' ? 5.4 : kind === 'critical' ? 2.35 : 2.15 + depthFactor * .2);
  const height = overrides.height ?? (kind === 'major' ? 2.25 : .86 + (kind === 'shield' ? .1 : 0));
  const health = overrides.health ?? targetHealth(kind);
  const speedScale = upgradeModifiers(state).targetSpeedScale * daily.speedScale * (performance.now() < overloadUntil ? 1.09 : 1);
  const kindScale = kind === 'priority' ? 1.12 : kind === 'critical' ? 1.24 : kind === 'legacy' ? .9 : kind === 'major' ? .58 : kind === 'duplicate' ? 1.04 : 1;
  const speed = overrides.speed ?? config.speed * speedScale * kindScale * randomBetween(.9, 1.08);
  const target = {
    id: targetId,
    ticket: 4700 + targetId,
    kind,
    direction,
    x: overrides.x ?? (direction > 0 ? -xLimit - width : xLimit + width),
    y: overrides.y ?? randomBetween(1.2, 5.2),
    baseY: overrides.y ?? randomBetween(1.2, 5.2),
    z,
    width,
    height,
    depth: kind === 'major' ? .62 : .3,
    speed,
    phase: Math.random() * Math.PI * 2,
    waveSpeed: randomBetween(1.25, 2.4),
    amplitude: kind === 'legacy' ? randomBetween(.65, 1.2) : randomBetween(.22, .62),
    yaw: randomBetween(-.2, .2),
    bank: 0,
    age: 0,
    health,
    maxHealth: health,
    flash: 0,
    alpha: 1,
    resolving: false,
    resolveAge: 0,
    dead: false,
    screen: null,
  };
  target.baseY = target.y;
  targets.push(target);
  targetId += 1;
  levelKindSpawns[kind] = (levelKindSpawns[kind] || 0) + 1;
  return target;
}

function updateTargets(delta) {
  const xLimit = 13.2 + renderer.aspect * 3;
  for (const target of targets) {
    target.flash = Math.max(0, target.flash - delta * 5.5);
    if (target.resolving) {
      target.resolveAge += delta;
      target.y -= delta * (1.4 + target.resolveAge * 3.2);
      target.z += delta * 4.4;
      target.bank += target.direction * delta * 4.8;
      target.alpha = clamp(1 - target.resolveAge / .74, 0, 1);
      if (target.resolveAge > .76) target.dead = true;
      continue;
    }

    target.age += delta;
    target.x += target.direction * target.speed * delta;
    if (target.kind === 'legacy') {
      target.y = target.baseY + Math.sin(target.age * target.waveSpeed + target.phase) * target.amplitude
        + Math.sin(target.age * .77 + target.phase * .5) * .24;
      target.z += Math.sin(target.age * 1.15 + target.phase) * delta * .65;
    } else if (target.kind === 'critical') {
      target.y = target.baseY + Math.sin(target.age * 3.1 + target.phase) * target.amplitude;
      target.x += Math.sin(target.age * 5.2 + target.phase) * delta * .48;
    } else if (target.kind === 'duplicate') {
      target.y = target.baseY + Math.sin(target.age * 2.7 + target.phase) * target.amplitude * .7;
      target.alpha = .72 + Math.sin(target.age * 7) * .14;
    } else if (target.kind === 'major') {
      target.y = target.baseY + Math.sin(target.age * .9) * .34;
      target.x += Math.sin(target.age * 1.25) * delta * 1.1;
    } else {
      target.y = target.baseY + Math.sin(target.age * target.waveSpeed + target.phase) * target.amplitude;
    }
    target.bank = Math.sin(target.age * target.waveSpeed * .7 + target.phase) * (target.kind === 'major' ? .035 : .09);
    target.yaw = Math.sin(target.age * .65 + target.phase) * .22;

    if ((target.direction > 0 && target.x > xLimit + target.width) || (target.direction < 0 && target.x < -xLimit - target.width)) {
      target.dead = true;
      const escaped = recordEscape(state, { kind: target.kind });
      state = escaped.state;
      if (escaped.pressureGain > 0 && daily.pressureScale !== 1) {
        const adjusted = Math.round(escaped.pressureGain * daily.pressureScale);
        state = { ...state, queuePressure: clamp(state.queuePressure - escaped.pressureGain + adjusted, 0, QUEUE_MAX) };
      }
      if (target.kind !== 'duplicate') {
        if (escaped.guarded) showMessage('Eskaleringvernet absorberte køtrykket.');
        else showMessage('Saken eskalerte. Køtrykket øker.', true);
        sound.escape();
      }
      if (escaped.overloaded) activateOverload();
    }
  }
  targets = targets.filter((target) => !target.dead);
}

function activateFlow(now = performance.now()) {
  const modifiers = upgradeModifiers(state);
  flowUntil = now + 7_000 + modifiers.flowDurationBonusMs;
  showMessage('Saksflyt aktivert — sakte film og dobbelt poeng!', false, 1_300);
  showScorePop('SAKSFLYT ×2', renderer.width / 2, renderer.height * .38);
  sound.flow();
}

function activateOverload(now = performance.now()) {
  overloadUntil = now + 7_500;
  showMessage('KØOVERLAST — stabiliser før trykket bygger seg opp igjen.', true, 1_500);
  sound.overload();
}

function maybeScheduleQuiz(hit, roll = Math.random()) {
  if (!shouldTriggerQuiz(hit, roll, quizActive || quizPending || intermissionActive || intermissionPending || pendingWin || state.status !== 'running')) return false;
  state = recordQuizOffer(state);
  quizPending = true;
  const token = roundToken;
  window.clearTimeout(quizTimer);
  quizTimer = window.setTimeout(() => {
    if (token === roundToken && state.status === 'running') openQuiz();
  }, testMode ? 12 : 430);
  return true;
}

function handleTargetHit(target, x, y, quizRoll = Math.random()) {
  if (!target || target.dead || target.resolving) return false;
  const flowActive = performance.now() < flowUntil;
  const pan = clamp((x / Math.max(renderer.width, 1) - .5) * 2, -1, 1);

  if (target.kind === 'duplicate') {
    const result = recordDecoyHit(state);
    state = result.state;
    target.resolving = true;
    target.flash = 1;
    renderer.pulseImpact(target, { color: '#ff5f68', strength: .8 });
    showImpact(x, y, true);
    showScorePop(`−${result.penalty}`, x, y, true);
    showMessage('Duplikat! Den saken skulle ikke behandles.', true, 1_050);
    sound.decoy();
    updateHud();
    return true;
  }

  const modifiers = upgradeModifiers(state);
  const damage = 1 + (target.kind === 'major' ? modifiers.bossDamageBonus : 0);
  target.health = Math.max(0, target.health - damage);
  target.flash = 1;
  const resolved = target.health <= 0;
  const shieldBroken = resolved && (target.kind === 'shield' || target.kind === 'critical');
  const scoreScale = daily.scoreScale * (daily.priorityScoreScale && (target.kind === 'priority' || target.kind === 'critical') ? daily.priorityScoreScale : 1) * (flowActive ? 2 : 1);
  const result = recordShot(state, {
    hit: true,
    resolved,
    kind: target.kind,
    scoreScale,
    flowScale: daily.flowScale || 1,
    shieldBroken,
  });
  state = result.state;

  renderer.pulseImpact(target, { strength: target.kind === 'major' ? 1.45 : resolved ? 1 : .62 });
  showImpact(x, y);
  sound.hit(state.streak, pan, !resolved);

  if (resolved) {
    target.resolving = true;
    target.resolveAge = 0;
    showScorePop(`+${result.events.scoreGain.toLocaleString('nb-NO')}`, x, y);
    showMessage(state.status === 'won' ? 'Hovedhendelsen er lukket!' : POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)]);
  } else {
    showScorePop(`SKJERMING ${target.health}/${target.maxHealth}`, x, y);
    showMessage(target.kind === 'major' ? `Hovedhendelsen: ${target.health} skjermingslag gjenstår.` : 'Skjermingen er svekket. Treff igjen.');
  }

  if (state.streak >= 3 && [3, 5, 9, 14, 20].includes(state.streak)) {
    ui.comboCell.classList.remove('is-hot');
    void ui.comboCell.offsetWidth;
    ui.comboCell.classList.add('is-hot');
    sound.combo(state.streak);
  }
  if (result.events.flowActivated) activateFlow();

  if (result.events.won) {
    pendingWin = true;
    targets.forEach((candidate) => { if (candidate !== target) candidate.resolving = true; });
    const token = roundToken;
    window.clearTimeout(winTimer);
    winTimer = window.setTimeout(() => {
      if (token === roundToken) finishRound();
    }, testMode ? 35 : 850);
  } else if (result.events.levelCompleted) {
    intermissionPending = true;
    targets.forEach((candidate) => { if (!candidate.resolving) candidate.resolving = true; });
    const completedLevel = state.level - 1;
    const token = roundToken;
    window.clearTimeout(intermissionTimer);
    intermissionTimer = window.setTimeout(() => {
      if (token === roundToken) openIntermission(completedLevel);
    }, testMode ? 25 : 780);
  } else {
    maybeScheduleQuiz(true, quizRoll);
  }

  updateHud();
  return true;
}

function shoot(x, y) {
  if (state.status !== 'running' || paused || quizActive || quizPending || intermissionActive || intermissionPending || pendingWin) return false;
  triggerWeaponFire();
  sound.shot();
  const target = renderer.hitTest(targets, x, y, upgradeModifiers(state).hitboxScale);
  if (target) return handleTargetHit(target, x, y);

  const result = recordShot(state, { hit: false });
  state = result.state;
  renderer.pulseMiss(x, y);
  showImpact(x, y, true);
  if (result.events.comboProtected) {
    showMessage('Kombobufferen reddet serien.');
    showScorePop('BUFFER', x, y);
  } else {
    showMessage('Bom — saken flyr videre.', true, 580);
    showScorePop('BOM', x, y, true);
  }
  sound.miss();
  updateHud();
  return false;
}

function buildQuestionDeck() {
  questionDeck = shuffle(NOARK_QUESTIONS);
  questionIndex = 0;
}

function openQuiz() {
  if (state.status !== 'running' || intermissionActive || pendingWin) return;
  quizPending = false;
  quizActive = true;
  if (!questionDeck.length || questionIndex >= questionDeck.length) buildQuestionDeck();
  currentQuestion = questionDeck[questionIndex];
  questionIndex += 1;
  ui.quizNumber.textContent = String(state.quizOffered).padStart(2, '0');
  ui.quizTitle.textContent = currentQuestion.question;
  ui.quizFeedback.textContent = '';
  ui.quizFeedback.className = 'quiz-feedback';
  ui.quizOptions.replaceChildren();
  currentQuestion.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'quiz-option';
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => answerQuiz(index));
    ui.quizOptions.append(button);
  });
  showOverlay(ui.quizOverlay);
  updateHud();
  sound.quizOpen();
  window.setTimeout(() => ui.quizOptions.querySelector('button')?.focus({ preventScroll: true }), 30);
}

function answerQuiz(index) {
  if (!quizActive || !currentQuestion) return false;
  const correct = index === currentQuestion.correct;
  [...ui.quizOptions.querySelectorAll('button')].forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === currentQuestion.correct) button.classList.add('is-correct');
    if (!correct && buttonIndex === index) button.classList.add('is-wrong');
  });
  const result = recordQuizAnswer(state, correct);
  state = result.state;
  ui.quizFeedback.classList.add(correct ? 'is-correct' : 'is-wrong');
  ui.quizFeedback.textContent = correct
    ? `${currentQuestion.explanation} +1 prestasjonspoeng.`
    : `${currentQuestion.explanation} −1 prestasjonspoeng.`;
  if (correct) {
    const duration = 6_000 + upgradeModifiers(state).quizSlowBonusMs;
    flowUntil = Math.max(flowUntil, performance.now() + duration);
    showScorePop('+1 NOARK', renderer.width / 2, renderer.height * .4);
    sound.quizCorrect();
  } else {
    showScorePop('−1 NOARK', renderer.width / 2, renderer.height * .4, true);
    sound.quizWrong();
  }
  updateHud();
  window.setTimeout(() => {
    quizActive = false;
    currentQuestion = null;
    hideOverlay(ui.quizOverlay);
    updateHud();
    canvas.focus({ preventScroll: true });
  }, testMode ? 25 : 1_250);
  return correct;
}

function pickUpgradeChoices() {
  const available = Object.keys(UPGRADE_DEFINITIONS).filter((id) => !state.upgrades.includes(id));
  return shuffle(available).slice(0, Math.min(3, available.length));
}

function openIntermission(completedLevel) {
  if (state.status !== 'running') return;
  intermissionPending = false;
  intermissionActive = true;
  const completed = LEVELS[completedLevel - 1];
  const next = LEVELS[state.level - 1];
  const snapshot = { ...state, level: completedLevel, levelStartedAt: 1 };
  const levelDuration = Math.max(1, activeElapsedMs - levelActiveStartMs);
  const starCount = levelStars(snapshot, completedLevel, levelDuration + 1);
  const levelAccuracy = state.levelShots ? Math.round((state.levelHits / state.levelShots) * 100) : 0;
  const objectiveDone = levelObjectiveComplete(snapshot, completedLevel);

  ui.completedLevelLabel.textContent = `NIVÅ ${String(completedLevel).padStart(2, '0')} FULLFØRT`;
  ui.levelStars.textContent = `${'★'.repeat(starCount)}${'☆'.repeat(3 - starCount)}`;
  ui.intermissionTitle.textContent = `${completed.name} fullført`;
  ui.intermissionSummary.textContent = objectiveDone
    ? `Oppdraget er fullført. Neste nivå: ${next.name} — ${next.subtitle}`
    : `Nivået er bestått. Bonusoppdraget glapp, men neste nivå er klart: ${next.name}.`;
  ui.levelResultTime.textContent = formatTime(levelDuration);
  ui.levelResultAccuracy.textContent = `${levelAccuracy} %`;
  ui.levelResultCombo.textContent = String(state.bestStreak);
  ui.levelResultObjective.textContent = objectiveDone ? 'Fullført' : 'Ikke fullført';

  selectedUpgrade = null;
  upgradeChoices = pickUpgradeChoices();
  ui.upgradeOptions.replaceChildren();
  for (const id of upgradeChoices) {
    const definition = UPGRADE_DEFINITIONS[id];
    const button = document.createElement('button');
    button.className = 'upgrade-option';
    button.type = 'button';
    button.dataset.upgrade = id;
    button.innerHTML = `<i>${definition.icon}</i><b>${definition.name}</b><p>${definition.description}</p>`;
    button.addEventListener('click', () => selectUpgrade(id));
    ui.upgradeOptions.append(button);
  }
  ui.continueButton.disabled = upgradeChoices.length > 0;
  ui.continueButton.textContent = upgradeChoices.length ? 'Velg en modul' : 'Fortsett til neste nivå';
  showOverlay(ui.intermissionOverlay);
  updateHud();
  window.setTimeout(() => ui.upgradeOptions.querySelector('button')?.focus({ preventScroll: true }), 40);
}

function selectUpgrade(id) {
  if (!intermissionActive || !upgradeChoices.includes(id)) return;
  selectedUpgrade = id;
  [...ui.upgradeOptions.children].forEach((button) => button.classList.toggle('is-selected', button.dataset.upgrade === id));
  ui.continueButton.disabled = false;
  ui.continueButton.textContent = `Installer ${UPGRADE_DEFINITIONS[id].name}`;
}

function continueAfterIntermission() {
  if (!intermissionActive || (upgradeChoices.length && !selectedUpgrade)) return false;
  if (selectedUpgrade) state = applyUpgrade(state, selectedUpgrade);
  state = beginLevel(state, state.level, Date.now());
  levelKindSpawns = {};
  levelActiveStartMs = activeElapsedMs;
  intermissionActive = false;
  hideOverlay(ui.intermissionOverlay);
  showLevelBanner(state.level);
  if (selectedUpgrade) {
    showMessage(`${UPGRADE_DEFINITIONS[selectedUpgrade].name} er installert.`);
    sound.upgrade();
  }
  selectedUpgrade = null;
  upgradeChoices = [];
  spawnClock = testMode ? 0 : .3;
  updateHud();
  canvas.focus({ preventScroll: true });
  return true;
}

function togglePause(force) {
  if (state.status !== 'running' || quizActive || quizPending || intermissionActive || intermissionPending || pendingWin) return;
  paused = typeof force === 'boolean' ? force : !paused;
  if (paused) {
    showOverlay(ui.pauseOverlay);
    ui.resumeButton.focus({ preventScroll: true });
  } else {
    hideOverlay(ui.pauseOverlay);
    canvas.focus({ preventScroll: true });
  }
  updateHud();
  updateReticle();
}

function startRound() {
  roundToken += 1;
  window.clearTimeout(quizTimer);
  window.clearTimeout(intermissionTimer);
  window.clearTimeout(winTimer);
  state = startGame(state, Date.now());
  targets = [];
  targetId = 1;
  spawnClock = testMode ? 0 : .25;
  lastFrame = performance.now();
  sceneTime = 0;
  activeElapsedMs = 0;
  levelActiveStartMs = 0;
  paused = false;
  quizActive = false;
  quizPending = false;
  intermissionActive = false;
  intermissionPending = false;
  pendingWin = false;
  currentQuestion = null;
  selectedUpgrade = null;
  upgradeChoices = [];
  flowUntil = 0;
  overloadUntil = 0;
  finaleAnnounced = false;
  lastAchievementCount = 0;
  finalSnapshot = null;
  levelKindSpawns = {};
  buildQuestionDeck();
  renderer.clearEffects();
  ui.upgradeDots.replaceChildren();
  hideOverlay(ui.startOverlay);
  hideOverlay(ui.quizOverlay);
  hideOverlay(ui.intermissionOverlay);
  hideOverlay(ui.pauseOverlay);
  hideOverlay(ui.winOverlay);
  ui.shareStatus.textContent = '';
  aim.x = renderer.width / 2;
  aim.y = renderer.height * .43;
  aim.visible = true;
  setAim(aim.x, aim.y, 'keyboard');
  updateHud();
  showLevelBanner(1);
  showMessage('Femminuttersvakten er i gang.');
  sound.start();
  canvas.focus({ preventScroll: true });
}

function finishRound() {
  if (state.status !== 'won') return;
  pendingWin = false;
  const evaluated = resultState();
  const grade = performanceGrade(evaluated, evaluated.finishedAt);
  const performance = performanceScore(evaluated, evaluated.finishedAt);
  const accuracy = Math.round(accuracyPercent(evaluated));
  const xpGain = careerXpForRun(evaluated, evaluated.finishedAt);
  const previousCareer = { ...career };
  career = { xp: career.xp + xpGain, runs: career.runs + 1, bestScore: Math.max(career.bestScore, state.score) };
  writeCareer(career);

  const isRecord = !highRecord || state.score > highRecord.score || (state.score === highRecord.score && activeElapsedMs < highRecord.timeMs);
  if (isRecord) {
    highRecord = { score: state.score, performance, timeMs: activeElapsedMs, grade: grade.grade, date: Date.now() };
    writeRecord(highRecord);
  }

  finalSnapshot = { grade, performance, accuracy, xpGain, previousCareer, career, isRecord, activeElapsedMs, dailyCode: daily.code };
  ui.gradeText.textContent = grade.grade;
  ui.resultTitle.textContent = grade.title;
  ui.resultPerformance.textContent = `${performance.toFixed(1).replace('.', ',')} ytelsespoeng`;
  ui.resultScore.textContent = state.score.toLocaleString('nb-NO');
  ui.resultRecord.textContent = isRecord ? 'Ny lokal rekord' : `Rekord: ${highRecord.score.toLocaleString('nb-NO')}`;
  ui.resultTime.textContent = formatTime(activeElapsedMs);
  ui.resultAccuracy.textContent = `${accuracy} %`;
  ui.resultCombo.textContent = String(state.bestStreak);
  ui.resultQuiz.textContent = `${state.quizCorrect}/${state.quizAnswered}`;
  ui.resultEscalations.textContent = String(state.escalations);
  ui.resultFlow.textContent = `${state.flowActivations}×`;
  ui.winSummary.textContent = `${grade.title}. Hovedhendelsen er lukket etter ${formatTime(activeElapsedMs)} aktiv spilletid. ${daily.code} er klar for sammenligning ved kaffemaskinen.`;

  const achievements = unlockedAchievements(state);
  ui.badgeRow.replaceChildren();
  for (const [id, unlocked] of Object.entries(achievements)) {
    if (!unlocked) continue;
    const badge = document.createElement('span');
    badge.className = 'result-badge';
    badge.textContent = ACHIEVEMENT_LABELS[id];
    ui.badgeRow.append(badge);
  }
  ui.resultAchievementCount.textContent = `${achievementCount(state)}/8`;

  const careerState = careerProgress(career.xp);
  ui.resultCareerRank.textContent = careerState.rank.name;
  ui.resultCareerXp.textContent = `+${xpGain.toLocaleString('nb-NO')} XP`;
  ui.resultCareerTotal.textContent = `${career.xp.toLocaleString('nb-NO')} XP totalt`;
  ui.resultCareerFill.style.width = `${careerState.percent}%`;

  updateStartMeta();
  updateHud();
  renderer.spawnConfetti();
  sound.stopAmbient();
  sound.win();
  showOverlay(ui.winOverlay);
  ui.restartButton.focus({ preventScroll: true });
}

function resultShareText() {
  if (!finalSnapshot) return '';
  return `Brukerstøttejakten 4.0 — ${finalSnapshot.dailyCode}\n${finalSnapshot.grade.grade} · ${finalSnapshot.grade.title}\n${state.score.toLocaleString('nb-NO')} poeng · ${formatTime(finalSnapshot.activeElapsedMs)} · ${finalSnapshot.accuracy} % treff\nBeste serie: ${state.bestStreak} · Noark 5: ${state.quizCorrect}/${state.quizAnswered}\n${window.location.origin}${window.location.pathname}`;
}

async function shareResult() {
  const text = resultShareText();
  if (!text) return;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Brukerstøttejakten 4.0', text });
      ui.shareStatus.textContent = 'Resultatet er delt.';
      return;
    }
    await navigator.clipboard.writeText(text);
    ui.shareStatus.textContent = 'Resultatet er kopiert. Lim det inn i kollegachatten.';
  } catch (error) {
    if (error?.name === 'AbortError') return;
    ui.shareStatus.textContent = 'Deling ble ikke tilgjengelig i denne nettleseren.';
  }
}

function updateGame(delta, now) {
  const flowActive = now < flowUntil;
  const overloadActive = now < overloadUntil;
  const active = state.status === 'running' && !paused && !quizActive && !quizPending && !intermissionActive && !intermissionPending && !pendingWin;
  const timeScale = flowActive ? .48 : 1;
  const gameDelta = active ? delta * timeScale : 0;
  sceneTime += delta * (active ? timeScale : .18);
  if (active) activeElapsedMs += delta * 1000;

  if (active) {
    spawnClock -= gameDelta;
    const config = levelConfig();
    const live = targets.filter((target) => !target.dead && !target.resolving).length;
    const maxTargets = config.maxTargets + (overloadActive ? 1 : 0) + (daily.name === 'Høy trafikk' && state.level >= 4 ? 1 : 0);
    if (spawnClock <= 0 && live < maxTargets) {
      spawnTarget();
      const [min, max] = config.interval;
      spawnClock = randomBetween(min, max) * daily.spawnScale * (overloadActive ? .76 : 1);
    }
    updateTargets(gameDelta);
    if (aim.hideAt && now > aim.hideAt) {
      aim.visible = false;
      aim.hideAt = 0;
      updateReticle();
    }
  }

  renderer.render({ time: sceneTime, delta, level: state.level, targets, overload: overloadActive });
  updateRadar();
  updateReticle();
  updateHud(now);
}

function gameLoop(now) {
  const delta = clamp((now - lastFrame) / 1000, 0, .045);
  lastFrame = now;
  updateGame(delta, now);
  requestAnimationFrame(gameLoop);
}

function debugTarget(kind = 'normal') {
  const target = spawnTarget({
    kind,
    direction: 1,
    x: 0,
    y: 2.6,
    z: kind === 'major' ? -4.8 : -6.5,
    speed: 0,
  });
  if (target) {
    renderer.render({ time: sceneTime, delta: 0, level: state.level, targets, overload: false });
    const center = target.screen?.center || { x: renderer.width / 2, y: renderer.height / 2 };
    return { target, center };
  }
  return null;
}

function debugResolve(kind = 'normal', quizRoll = 1) {
  if (state.status !== 'running' || paused || quizActive || quizPending || intermissionActive || intermissionPending || pendingWin) return false;
  const created = debugTarget(kind);
  if (!created) return false;
  while (!created.target.resolving && created.target.health > 0) handleTargetHit(created.target, created.center.x, created.center.y, quizRoll);
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
  sound.ensure();
  shoot(point.x, point.y);
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p' && state.status === 'running' && !quizActive && !intermissionActive) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (state.status !== 'running' || paused || quizActive || quizPending || intermissionActive || intermissionPending || pendingWin) return;
  const step = event.shiftKey ? 36 : 21;
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
    setAim(aim.x, aim.y, 'keyboard');
    shoot(aim.x, aim.y);
  }
});

ui.startButton.addEventListener('click', startRound);
ui.restartButton.addEventListener('click', startRound);
ui.resumeButton.addEventListener('click', () => togglePause(false));
ui.pauseButton.addEventListener('click', () => togglePause());
ui.continueButton.addEventListener('click', continueAfterIntermission);
ui.shareButton.addEventListener('click', shareResult);
ui.soundButton.addEventListener('click', () => {
  sound.setEnabled(!sound.enabled);
  ui.soundButton.setAttribute('aria-pressed', String(sound.enabled));
  ui.soundButton.querySelector('b').textContent = sound.enabled ? 'Lyd' : 'Lyd av';
});
ui.fullscreenButton.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await board.requestFullscreen();
    else await document.exitFullscreen();
  } catch { showMessage('Fullskjerm er ikke tilgjengelig her.', true); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.status === 'running' && !paused && !quizActive && !intermissionActive) togglePause(true);
});
window.addEventListener('resize', resize, { passive: true });
new ResizeObserver(resize).observe(board);

if (testMode) {
  window.__brukerstottejakten = {
    start: startRound,
    resolve: (kind = 'normal') => debugResolve(kind, 1),
    resolveWithQuiz: (kind = 'normal') => debugResolve(kind, 0),
    miss: () => shoot(4, 4),
    answerCorrect: () => currentQuestion ? answerQuiz(currentQuestion.correct) : false,
    answerWrong: () => currentQuestion ? answerQuiz(currentQuestion.correct === 0 ? 1 : 0) : false,
    selectUpgrade: (index = 0) => {
      const id = upgradeChoices[index] || upgradeChoices[0];
      if (id) selectUpgrade(id);
      return id || null;
    },
    continueLevel: continueAfterIntermission,
    forceFlow: () => { state = { ...state, flow: 98 }; return debugResolve('normal', 1); },
    getState: () => ({
      ...state,
      paused,
      quizActive,
      quizPending,
      intermissionActive,
      intermissionPending,
      pendingWin,
      activeElapsedMs,
      targetCount: targets.length,
      daily,
    }),
  };
}

updateStartMeta();
resize();
updateHud();
requestAnimationFrame(gameLoop);
