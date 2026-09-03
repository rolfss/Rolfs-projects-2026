export const TARGET_CASES = 10;
export const QUIZ_MILESTONES = Object.freeze([3, 6, 9]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  return {
    ...createGameState(),
    status: 'running',
    startedAt: now,
  };
}

export function recordShot(state, hit, now = Date.now()) {
  if (state.status !== 'running') return state;

  const shots = state.shots + 1;
  if (!hit) {
    return { ...state, shots, streak: 0 };
  }

  const casesSolved = clamp(state.casesSolved + 1, 0, TARGET_CASES);
  const streak = state.streak + 1;
  const won = casesSolved === TARGET_CASES;

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
