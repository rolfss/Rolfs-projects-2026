export const TARGET_CASES = 10;
export const QUIZ_TRIGGER_PROBABILITY = 0.3;
export const LEVEL_THRESHOLDS = Object.freeze([0, 3, 6, 9]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function levelForCases(casesSolved) {
  if (casesSolved >= LEVEL_THRESHOLDS[3]) return 4;
  if (casesSolved >= LEVEL_THRESHOLDS[2]) return 3;
  if (casesSolved >= LEVEL_THRESHOLDS[1]) return 2;
  return 1;
}

export function createGameState() {
  return {
    status: 'idle',
    casesSolved: 0,
    points: 0,
    shots: 0,
    escalations: 0,
    streak: 0,
    bestStreak: 0,
    quizAnswered: 0,
    quizCorrect: 0,
    priorityHits: 0,
    legacyHits: 0,
    level: 1,
    startedAt: 0,
    finishedAt: 0,
  };
}

export function startGame(_state, now = Date.now()) {
  return {
    ...createGameState(),
    status: 'running',
    startedAt: now,
  };
}

export function recordShot(state, hit, now = Date.now(), kind = 'normal') {
  if (state.status !== 'running') return state;

  const shots = state.shots + 1;
  if (!hit) {
    return {
      ...state,
      shots,
      streak: 0,
    };
  }

  const casesSolved = clamp(state.casesSolved + 1, 0, TARGET_CASES);
  const streak = state.streak + 1;
  const won = casesSolved >= TARGET_CASES;

  return {
    ...state,
    casesSolved,
    points: state.points + 1,
    shots,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    priorityHits: state.priorityHits + (kind === 'priority' ? 1 : 0),
    legacyHits: state.legacyHits + (kind === 'legacy' ? 1 : 0),
    level: levelForCases(casesSolved),
    status: won ? 'won' : 'running',
    finishedAt: won ? now : 0,
  };
}

export function recordEscape(state) {
  if (state.status !== 'running') return state;
  return {
    ...state,
    escalations: state.escalations + 1,
    streak: 0,
  };
}

export function recordQuizAnswer(state, correct) {
  if (state.status !== 'running' && state.status !== 'won') return state;
  return {
    ...state,
    points: Math.max(0, state.points + (correct ? 1 : -1)),
    quizAnswered: state.quizAnswered + 1,
    quizCorrect: state.quizCorrect + (correct ? 1 : 0),
  };
}

export function shouldTriggerQuiz(hit, roll = Math.random(), blocked = false) {
  return Boolean(hit) && !blocked && roll >= 0 && roll < QUIZ_TRIGGER_PROBABILITY;
}

export function progressPercent(casesSolved) {
  return clamp((casesSolved / TARGET_CASES) * 100, 0, 100);
}

export function accuracyPercent(state) {
  if (!state.shots) return 0;
  return clamp((state.casesSolved / state.shots) * 100, 0, 100);
}

export function elapsedSeconds(state, now = Date.now()) {
  if (!state.startedAt) return 0;
  const end = state.finishedAt || now;
  return Math.max(0, (end - state.startedAt) / 1000);
}

export function unlockedMissions(state) {
  return {
    triage: state.casesSolved >= 3,
    flow: state.bestStreak >= 4,
    priority: state.priorityHits >= 1,
    noark: state.quizCorrect >= 2,
    control: state.casesSolved >= 8 && state.escalations <= 2,
  };
}

export function missionCount(state) {
  return Object.values(unlockedMissions(state)).filter(Boolean).length;
}

export function performanceScore(state, now = Date.now()) {
  const accuracy = accuracyPercent(state);
  const seconds = elapsedSeconds(state, now);
  const speedBonus = clamp((75 - seconds) / 12, 0, 4);
  const accuracyBonus = clamp((accuracy - 55) / 10, 0, 4.5);
  const missionBonus = missionCount(state) * 0.7;
  const quizBonus = state.quizCorrect * 0.45;
  const penalty = state.escalations * 0.4;
  return Math.max(0, state.points + speedBonus + accuracyBonus + missionBonus + quizBonus - penalty);
}

export function performanceGrade(state, now = Date.now()) {
  const score = performanceScore(state, now);
  if (score >= 20) return { grade: 'S', title: 'Driftslegende' };
  if (score >= 16.5) return { grade: 'A', title: 'Køknuser' };
  if (score >= 13) return { grade: 'B', title: 'Solid problemløser' };
  if (score >= 10) return { grade: 'C', title: 'Trygg førstelinje' };
  return { grade: 'D', title: 'Vakten er fullført' };
}
