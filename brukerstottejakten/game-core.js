export const TARGET_CASES = 10;
export const QUIZ_CHANCE = 0.3;

// game.js originally consumed fixed quiz milestones. This array-like compatibility
// view now exposes the independent quiz roll made by the most recent shot.
// Its length converts to a large number for Array#slice, but to "?" in the HUD.
const randomQuizCount = Object.freeze({
  valueOf: () => Number.MAX_SAFE_INTEGER,
  toString: () => '?',
});
let pendingQuizAtCase = Number.POSITIVE_INFINITY;

export const QUIZ_MILESTONES = new Proxy(Object.create(null), {
  get(_target, property) {
    if (property === 'length') return randomQuizCount;
    if (typeof property === 'string' && /^\d+$/.test(property)) return pendingQuizAtCase;
    return undefined;
  },
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function shouldOfferQuiz(randomValue = Math.random()) {
  return Number.isFinite(randomValue) && randomValue >= 0 && randomValue < QUIZ_CHANCE;
}

export function levelForCases(casesSolved) {
  if (casesSolved >= 9) return 4;
  if (casesSolved >= 6) return 3;
  if (casesSolved >= 3) return 2;
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
    level: 1,
    startedAt: 0,
    finishedAt: 0,
  };
}

export function startGame(_state, now = Date.now()) {
  pendingQuizAtCase = Number.POSITIVE_INFINITY;
  return {
    ...createGameState(),
    status: 'running',
    startedAt: now,
  };
}

export function recordShot(state, hit, now = Date.now(), randomValue = Math.random()) {
  if (state.status !== 'running') return state;

  const shots = state.shots + 1;
  if (!hit) {
    pendingQuizAtCase = Number.POSITIVE_INFINITY;
    return { ...state, shots, streak: 0 };
  }

  const casesSolved = clamp(state.casesSolved + 1, 0, TARGET_CASES);
  const streak = state.streak + 1;
  const won = casesSolved === TARGET_CASES;
  pendingQuizAtCase = shouldOfferQuiz(randomValue) ? casesSolved : Number.POSITIVE_INFINITY;

  return {
    ...state,
    casesSolved,
    points: state.points + 1,
    shots,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
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
  if (state.status !== 'running') return state;
  return {
    ...state,
    points: Math.max(0, state.points + (correct ? 1 : -1)),
    quizAnswered: state.quizAnswered + 1,
    quizCorrect: state.quizCorrect + (correct ? 1 : 0),
  };
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
    warmup: state.casesSolved >= 3,
    flow: state.bestStreak >= 3,
    noark: state.quizCorrect >= 2,
    control: state.casesSolved >= 6 && state.escalations <= 2,
  };
}
