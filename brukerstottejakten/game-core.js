export const TARGET_CASES = 80;
export const CASES_PER_LEVEL = 8;
export const LEVEL_COUNT = 10;
export const QUIZ_TRIGGER_PROBABILITY = 0.3;
export const FLOW_MAX = 100;
export const QUEUE_MAX = 100;

export const LEVELS = Object.freeze([
  Object.freeze({ id: 1, name: 'Pålogging', subtitle: 'Kalibrer Service Manager Mk V', mechanic: 'Grunnleggende saker', objective: 'Løs 8 saker' }),
  Object.freeze({ id: 2, name: 'Førstelinje', subtitle: 'Bygg rytme og komboserier', mechanic: 'Kombobonus', objective: 'Oppnå en komboserie på 5' }),
  Object.freeze({ id: 3, name: 'Køkontroll', subtitle: 'Prioriter før SLA-en ryker', mechanic: 'Prioritetssaker', objective: 'Lukk 3 prioritetssaker' }),
  Object.freeze({ id: 4, name: 'Endringsvindu', subtitle: 'Bryt skjerming før saken kan lukkes', mechanic: 'Skjermede saker', objective: 'Bryt 2 skjerminger' }),
  Object.freeze({ id: 5, name: 'Duplikatstorm', subtitle: 'Ikke skyt samme sak to ganger', mechanic: 'Duplikater', objective: 'Unngå alle duplikater' }),
  Object.freeze({ id: 6, name: 'Migreringsnatt', subtitle: 'Eldre saker følger ikke rette linjer', mechanic: 'Legacy-bevegelse', objective: 'Lukk 3 eldre saker' }),
  Object.freeze({ id: 7, name: 'Hendelsesbro', subtitle: 'Trykket stiger — hold køen stabil', mechanic: 'Køtrykk og overlast', objective: 'Hold køtrykket under 80 %' }),
  Object.freeze({ id: 8, name: 'SLA-storm', subtitle: 'Høy fart, korte vinduer', mechanic: 'Kritiske saker', objective: 'Lukk 3 kritiske saker' }),
  Object.freeze({ id: 9, name: 'Revisjon', subtitle: 'Presisjon og Noark-kontroll', mechanic: 'Fagtest og presisjon', objective: 'Minst 75 % treffsikkerhet' }),
  Object.freeze({ id: 10, name: 'Hovedhendelse', subtitle: 'Stabiliser tjenesten og lukk P1-saken', mechanic: 'Flerfaset boss', objective: 'Lukk hovedhendelsen' }),
]);

export const UPGRADE_DEFINITIONS = Object.freeze({
  'aim-lens': Object.freeze({
    id: 'aim-lens',
    name: 'Semantisk søkerlinse',
    description: 'Treffområdet blir 18 % større.',
    icon: '◎',
  }),
  stabilizer: Object.freeze({
    id: 'stabilizer',
    name: 'Klientstabilisator',
    description: 'Alle saker beveger seg 8 % saktere.',
    icon: '◇',
  }),
  'flow-core': Object.freeze({
    id: 'flow-core',
    name: 'Saksflytkjerne',
    description: 'Saksflyt bygges 28 % raskere.',
    icon: '↯',
  }),
  'combo-buffer': Object.freeze({
    id: 'combo-buffer',
    name: 'Kombobuffer',
    description: 'Første bom i hvert nivå bryter ikke serien.',
    icon: '∞',
  }),
  'sla-scanner': Object.freeze({
    id: 'sla-scanner',
    name: 'SLA-skanner',
    description: 'Prioritets- og kritiske saker gir 45 % mer poeng.',
    icon: '△',
  }),
  'queue-shield': Object.freeze({
    id: 'queue-shield',
    name: 'Eskaleringvern',
    description: 'Første reelle eskalering i hvert nivå gir ikke køtrykk.',
    icon: '⬡',
  }),
  'knowledge-base': Object.freeze({
    id: 'knowledge-base',
    name: 'Kunnskapsbase',
    description: 'Riktig Noark-svar gir lengre sakte film og mer arkadepoeng.',
    icon: 'N5',
  }),
  'duplicate-filter': Object.freeze({
    id: 'duplicate-filter',
    name: 'Duplikatfilter',
    description: 'Duplikater merkes tydeligere og straffen halveres.',
    icon: '≠',
  }),
  cooling: Object.freeze({
    id: 'cooling',
    name: 'Kryogen kjøling',
    description: 'Saksflyt varer to sekunder lenger.',
    icon: '❄',
  }),
  'impact-amplifier': Object.freeze({
    id: 'impact-amplifier',
    name: 'Skjermingsbryter',
    description: 'Skjermede saker trenger ett færre treff.',
    icon: '✦',
  }),
  'auto-triage': Object.freeze({
    id: 'auto-triage',
    name: 'Autotriage',
    description: 'Hvert nytt nivå starter med 24 % Saksflyt.',
    icon: 'A',
  }),
  'precision-rail': Object.freeze({
    id: 'precision-rail',
    name: 'Presisjonsskinne',
    description: 'Treffområdet øker 10 %, og hovedhendelsen tar ekstra skade.',
    icon: '＋',
  }),
});

const TARGET_SCORE = Object.freeze({
  normal: 100,
  priority: 165,
  legacy: 135,
  shield: 190,
  critical: 240,
  major: 900,
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function levelForCases(casesSolved) {
  const solved = clamp(Math.floor(Number(casesSolved) || 0), 0, TARGET_CASES);
  if (solved >= TARGET_CASES) return LEVEL_COUNT;
  return clamp(Math.floor(solved / CASES_PER_LEVEL) + 1, 1, LEVEL_COUNT);
}

export function casesIntoLevel(casesSolved) {
  const solved = clamp(Math.floor(Number(casesSolved) || 0), 0, TARGET_CASES);
  if (solved >= TARGET_CASES) return CASES_PER_LEVEL;
  return solved % CASES_PER_LEVEL;
}

export function casesRemainingInLevel(casesSolved) {
  return Math.max(0, CASES_PER_LEVEL - casesIntoLevel(casesSolved));
}

export function shouldTriggerQuiz(hit, roll = Math.random(), blocked = false) {
  return Boolean(hit) && !blocked && Number.isFinite(roll) && roll >= 0 && roll < QUIZ_TRIGGER_PROBABILITY;
}

export function multiplierForStreak(streak) {
  const value = Math.max(0, Math.floor(Number(streak) || 0));
  if (value >= 20) return 3;
  if (value >= 14) return 2.5;
  if (value >= 9) return 2;
  if (value >= 5) return 1.5;
  if (value >= 3) return 1.25;
  return 1;
}

export function hasUpgrade(state, id) {
  return Array.isArray(state?.upgrades) && state.upgrades.includes(id);
}

export function upgradeModifiers(state) {
  return {
    hitboxScale: 1 + (hasUpgrade(state, 'aim-lens') ? 0.18 : 0) + (hasUpgrade(state, 'precision-rail') ? 0.1 : 0),
    targetSpeedScale: hasUpgrade(state, 'stabilizer') ? 0.92 : 1,
    flowGainScale: hasUpgrade(state, 'flow-core') ? 1.28 : 1,
    priorityScoreScale: hasUpgrade(state, 'sla-scanner') ? 1.45 : 1,
    quizSlowBonusMs: hasUpgrade(state, 'knowledge-base') ? 3_000 : 0,
    flowDurationBonusMs: hasUpgrade(state, 'cooling') ? 2_000 : 0,
    duplicatePenaltyScale: hasUpgrade(state, 'duplicate-filter') ? 0.5 : 1,
    shieldDamageBonus: hasUpgrade(state, 'impact-amplifier') ? 1 : 0,
    bossDamageBonus: hasUpgrade(state, 'precision-rail') ? 1 : 0,
  };
}

export function createGameState() {
  return {
    status: 'idle',
    casesSolved: 0,
    points: 0,
    score: 0,
    shots: 0,
    hits: 0,
    escalations: 0,
    decoysHit: 0,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    flow: 0,
    flowActivations: 0,
    queuePressure: 0,
    overloads: 0,
    quizOffered: 0,
    quizAnswered: 0,
    quizCorrect: 0,
    priorityHits: 0,
    legacyHits: 0,
    shieldBreaks: 0,
    criticalHits: 0,
    majorResolved: false,
    level: 1,
    levelCases: 0,
    levelShots: 0,
    levelHits: 0,
    levelEscalations: 0,
    levelDecoysHit: 0,
    levelPriorityHits: 0,
    levelLegacyHits: 0,
    levelShieldBreaks: 0,
    levelCriticalHits: 0,
    levelQuizCorrect: 0,
    levelPeakPressure: 0,
    comboShieldCharges: 0,
    queueShieldCharges: 0,
    upgrades: [],
    startedAt: 0,
    levelStartedAt: 0,
    finishedAt: 0,
  };
}

export function startGame(_state, now = Date.now()) {
  return {
    ...createGameState(),
    status: 'running',
    startedAt: now,
    levelStartedAt: now,
  };
}

export function beginLevel(state, level = state.level, now = Date.now()) {
  const nextLevel = clamp(Math.floor(level), 1, LEVEL_COUNT);
  return {
    ...state,
    level: nextLevel,
    levelCases: 0,
    levelShots: 0,
    levelHits: 0,
    levelEscalations: 0,
    levelDecoysHit: 0,
    levelPriorityHits: 0,
    levelLegacyHits: 0,
    levelShieldBreaks: 0,
    levelCriticalHits: 0,
    levelQuizCorrect: 0,
    levelPeakPressure: state.queuePressure,
    comboShieldCharges: hasUpgrade(state, 'combo-buffer') ? 1 : 0,
    queueShieldCharges: hasUpgrade(state, 'queue-shield') ? 1 : 0,
    flow: Math.max(state.flow, hasUpgrade(state, 'auto-triage') ? 24 : 0),
    levelStartedAt: now,
  };
}

export function applyUpgrade(state, upgradeId) {
  if (!UPGRADE_DEFINITIONS[upgradeId] || hasUpgrade(state, upgradeId)) return state;
  const next = {
    ...state,
    upgrades: [...state.upgrades, upgradeId],
  };
  if (upgradeId === 'combo-buffer') next.comboShieldCharges = Math.max(1, next.comboShieldCharges);
  if (upgradeId === 'queue-shield') next.queueShieldCharges = Math.max(1, next.queueShieldCharges);
  if (upgradeId === 'auto-triage') next.flow = Math.max(next.flow, 24);
  return next;
}

export function recordShot(
  state,
  {
    hit = false,
    resolved = false,
    kind = 'normal',
    now = Date.now(),
    scoreScale = 1,
    flowScale = 1,
    comboProtected = false,
    shieldBroken = false,
  } = {},
) {
  if (state.status !== 'running') return { state, events: { ignored: true } };

  const shots = state.shots + 1;
  const levelShots = state.levelShots + 1;

  if (!hit) {
    const shieldAvailable = comboProtected || state.comboShieldCharges > 0;
    const nextState = {
      ...state,
      shots,
      levelShots,
      comboShieldCharges: shieldAvailable && state.comboShieldCharges > 0 ? state.comboShieldCharges - 1 : state.comboShieldCharges,
      streak: shieldAvailable ? state.streak : 0,
      multiplier: shieldAvailable ? state.multiplier : 1,
      flow: Math.max(0, state.flow - (shieldAvailable ? 8 : 24)),
    };
    return {
      state: nextState,
      events: {
        hit: false,
        resolved: false,
        comboProtected: shieldAvailable,
        flowActivated: false,
        levelCompleted: false,
        won: false,
        scoreGain: 0,
      },
    };
  }

  const streak = state.streak + 1;
  const multiplier = multiplierForStreak(streak);
  const modifiers = upgradeModifiers(state);
  const priorityScale = kind === 'priority' || kind === 'critical' ? modifiers.priorityScoreScale : 1;
  const base = resolved ? (TARGET_SCORE[kind] ?? TARGET_SCORE.normal) : 35;
  const scoreGain = Math.round(base * multiplier * Math.max(0, scoreScale) * priorityScale);
  const rawFlowGain = (resolved ? 16 : 9) + Math.min(streak, 10) * 1.7;
  const flowGain = Math.round(rawFlowGain * Math.max(0, flowScale) * modifiers.flowGainScale);
  const accumulatedFlow = state.flow + flowGain;
  const flowActivated = accumulatedFlow >= FLOW_MAX;
  const flow = flowActivated ? accumulatedFlow - FLOW_MAX : accumulatedFlow;
  const casesSolved = resolved ? clamp(state.casesSolved + 1, 0, TARGET_CASES) : state.casesSolved;
  const levelCases = resolved ? state.levelCases + 1 : state.levelCases;
  const won = casesSolved >= TARGET_CASES;
  const levelCompleted = resolved && !won && casesSolved % CASES_PER_LEVEL === 0;
  const nextLevel = won ? LEVEL_COUNT : levelForCases(casesSolved);
  const queuePressure = Math.max(0, state.queuePressure - (resolved ? 5 : 1));

  const nextState = {
    ...state,
    status: won ? 'won' : 'running',
    casesSolved,
    points: state.points + (resolved ? 1 : 0),
    score: state.score + scoreGain,
    shots,
    hits: state.hits + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    multiplier,
    flow,
    flowActivations: state.flowActivations + (flowActivated ? 1 : 0),
    queuePressure,
    levelPeakPressure: Math.max(state.levelPeakPressure, queuePressure),
    level: nextLevel,
    levelCases,
    levelShots,
    levelHits: state.levelHits + 1,
    priorityHits: state.priorityHits + (resolved && kind === 'priority' ? 1 : 0),
    legacyHits: state.legacyHits + (resolved && kind === 'legacy' ? 1 : 0),
    shieldBreaks: state.shieldBreaks + (shieldBroken ? 1 : 0),
    criticalHits: state.criticalHits + (resolved && kind === 'critical' ? 1 : 0),
    majorResolved: state.majorResolved || (resolved && kind === 'major'),
    levelPriorityHits: state.levelPriorityHits + (resolved && kind === 'priority' ? 1 : 0),
    levelLegacyHits: state.levelLegacyHits + (resolved && kind === 'legacy' ? 1 : 0),
    levelShieldBreaks: state.levelShieldBreaks + (shieldBroken ? 1 : 0),
    levelCriticalHits: state.levelCriticalHits + (resolved && kind === 'critical' ? 1 : 0),
    finishedAt: won ? now : 0,
  };

  return {
    state: nextState,
    events: {
      hit: true,
      resolved,
      comboProtected: false,
      flowActivated,
      levelCompleted,
      won,
      scoreGain,
      multiplier,
    },
  };
}

export function recordDecoyHit(state) {
  if (state.status !== 'running') return { state, penalty: 0 };
  const modifiers = upgradeModifiers(state);
  const penalty = Math.round(180 * modifiers.duplicatePenaltyScale);
  const pressureGain = Math.round(16 * modifiers.duplicatePenaltyScale);
  const queuePressure = clamp(state.queuePressure + pressureGain, 0, QUEUE_MAX);
  return {
    state: {
      ...state,
      points: Math.max(0, state.points - 1),
      score: Math.max(0, state.score - penalty),
      shots: state.shots + 1,
      hits: state.hits + 1,
      decoysHit: state.decoysHit + 1,
      levelShots: state.levelShots + 1,
      levelHits: state.levelHits + 1,
      levelDecoysHit: state.levelDecoysHit + 1,
      streak: 0,
      multiplier: 1,
      flow: Math.max(0, state.flow - 30),
      queuePressure,
      levelPeakPressure: Math.max(state.levelPeakPressure, queuePressure),
    },
    penalty,
  };
}

export function recordEscape(state, { kind = 'normal' } = {}) {
  if (state.status !== 'running' || kind === 'duplicate') {
    return { state, guarded: false, overloaded: false, pressureGain: 0 };
  }

  const guarded = state.queueShieldCharges > 0;
  const pressureGain = guarded ? 0 : kind === 'critical' || kind === 'major' ? 27 : 18;
  let queuePressure = clamp(state.queuePressure + pressureGain, 0, QUEUE_MAX);
  const overloaded = queuePressure >= QUEUE_MAX;
  if (overloaded) queuePressure = 62;

  return {
    state: {
      ...state,
      escalations: state.escalations + 1,
      levelEscalations: state.levelEscalations + 1,
      queueShieldCharges: guarded ? state.queueShieldCharges - 1 : state.queueShieldCharges,
      queuePressure,
      levelPeakPressure: Math.max(state.levelPeakPressure, guarded ? state.queuePressure : state.queuePressure + pressureGain),
      overloads: state.overloads + (overloaded ? 1 : 0),
      streak: 0,
      multiplier: 1,
      flow: Math.max(0, state.flow - 18),
    },
    guarded,
    overloaded,
    pressureGain,
  };
}

export function recordQuizOffer(state) {
  if (state.status !== 'running') return state;
  return { ...state, quizOffered: state.quizOffered + 1 };
}

export function recordQuizAnswer(state, correct) {
  if (state.status !== 'running') return { state, pointDelta: 0, scoreDelta: 0 };
  const scoreDelta = correct ? (hasUpgrade(state, 'knowledge-base') ? 360 : 260) : -140;
  const points = Math.max(0, state.points + (correct ? 1 : -1));
  return {
    state: {
      ...state,
      points,
      score: Math.max(0, state.score + scoreDelta),
      quizAnswered: state.quizAnswered + 1,
      quizCorrect: state.quizCorrect + (correct ? 1 : 0),
      levelQuizCorrect: state.levelQuizCorrect + (correct ? 1 : 0),
      flow: correct ? clamp(state.flow + 18, 0, FLOW_MAX - 1) : Math.max(0, state.flow - 18),
    },
    pointDelta: correct ? 1 : -1,
    scoreDelta,
  };
}

export function progressPercent(casesSolved) {
  return clamp((Number(casesSolved) / TARGET_CASES) * 100, 0, 100);
}

export function levelProgressPercent(casesSolved) {
  return clamp((casesIntoLevel(casesSolved) / CASES_PER_LEVEL) * 100, 0, 100);
}

export function accuracyPercent(state) {
  if (!state.shots) return 0;
  return clamp((state.hits / state.shots) * 100, 0, 100);
}

export function resolveAccuracyPercent(state) {
  if (!state.shots) return 0;
  return clamp((state.casesSolved / state.shots) * 100, 0, 100);
}

export function elapsedSeconds(state, now = Date.now()) {
  if (!state.startedAt) return 0;
  const end = state.finishedAt || now;
  return Math.max(0, (end - state.startedAt) / 1000);
}

export function levelElapsedSeconds(state, now = Date.now()) {
  if (!state.levelStartedAt) return 0;
  return Math.max(0, (now - state.levelStartedAt) / 1000);
}

export function levelObjectiveComplete(state, level = state.level) {
  switch (level) {
    case 1: return state.levelCases >= CASES_PER_LEVEL;
    case 2: return state.bestStreak >= 5;
    case 3: return state.levelPriorityHits >= 3;
    case 4: return state.levelShieldBreaks >= 2;
    case 5: return state.levelDecoysHit === 0;
    case 6: return state.levelLegacyHits >= 3;
    case 7: return state.levelPeakPressure < 80;
    case 8: return state.levelCriticalHits >= 3;
    case 9: return accuracyPercent(state) >= 75;
    case 10: return state.majorResolved;
    default: return false;
  }
}

export function levelStars(state, level = state.level, now = Date.now()) {
  let stars = 1;
  if (levelObjectiveComplete(state, level)) stars += 1;
  const levelAccuracy = state.levelShots ? (state.levelHits / state.levelShots) * 100 : 0;
  const quickEnough = levelElapsedSeconds(state, now) <= 55;
  if (levelAccuracy >= 72 && state.levelEscalations <= 1 && quickEnough) stars += 1;
  return clamp(stars, 1, 3);
}

export function unlockedAchievements(state) {
  return {
    onboarding: state.casesSolved >= 8,
    combo: state.bestStreak >= 10,
    sla: state.priorityHits + state.criticalHits >= 8,
    shieldbreaker: state.shieldBreaks >= 4,
    noark: state.quizCorrect >= 5,
    precision: state.shots >= 20 && accuracyPercent(state) >= 80,
    calm: state.overloads === 0 && state.casesSolved >= 40,
    major: state.majorResolved,
  };
}

export function achievementCount(state) {
  return Object.values(unlockedAchievements(state)).filter(Boolean).length;
}

export function performanceScore(state, now = Date.now()) {
  const accuracy = accuracyPercent(state);
  const seconds = elapsedSeconds(state, now);
  const targetSeconds = 300;
  const paceBonus = clamp((targetSeconds + 90 - seconds) / 28, 0, 10);
  const accuracyBonus = clamp((accuracy - 50) / 4, 0, 12.5);
  const achievementBonus = achievementCount(state) * 1.6;
  const quizBonus = state.quizCorrect * 0.55;
  const flowBonus = state.flowActivations * 1.2;
  const penalty = state.escalations * 0.7 + state.decoysHit * 1.1 + state.overloads * 2.2;
  return Math.max(0, state.score / 1000 + paceBonus + accuracyBonus + achievementBonus + quizBonus + flowBonus - penalty);
}

export function performanceGrade(state, now = Date.now()) {
  const value = performanceScore(state, now);
  if (value >= 47) return { grade: 'S', title: 'Tjenesteeier av legendarisk kaliber' };
  if (value >= 39) return { grade: 'A', title: 'Senior problemløser' };
  if (value >= 31) return { grade: 'B', title: 'Applikasjonsforvalter' };
  if (value >= 23) return { grade: 'C', title: 'Trygg førstelinje' };
  return { grade: 'D', title: 'Vakten fullført' };
}

export function careerXpForRun(state, now = Date.now()) {
  const grade = performanceGrade(state, now).grade;
  const gradeBonus = { S: 650, A: 450, B: 300, C: 180, D: 100 }[grade] ?? 100;
  return Math.round(state.casesSolved * 12 + state.quizCorrect * 20 + achievementCount(state) * 55 + gradeBonus);
}

export function careerRank(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const ranks = [
    { min: 0, name: 'Nyansatt', level: 1 },
    { min: 700, name: 'Førstelinjerådgiver', level: 2 },
    { min: 1_700, name: 'Systemforvalter', level: 3 },
    { min: 3_200, name: 'Applikasjonsforvalter', level: 4 },
    { min: 5_200, name: 'Seniorrådgiver', level: 5 },
    { min: 7_800, name: 'Tjenesteeier', level: 6 },
    { min: 11_000, name: 'Driftslegende', level: 7 },
  ];
  return [...ranks].reverse().find((rank) => xp >= rank.min) ?? ranks[0];
}
