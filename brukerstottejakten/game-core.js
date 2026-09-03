export const TARGET_SCORE = 10;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createGameState() {
  return {
    status: 'idle',
    score: 0,
    shots: 0,
    misses: 0,
    startedAt: 0,
    finishedAt: 0,
  };
}

export function startGame(_state, now = Date.now()) {
  return {
    status: 'running',
    score: 0,
    shots: 0,
    misses: 0,
    startedAt: now,
    finishedAt: 0,
  };
}

export function recordShot(state, hit, now = Date.now()) {
  if (state.status !== 'running') return state;

  const score = clamp(state.score + (hit ? 1 : 0), 0, TARGET_SCORE);
  const won = score === TARGET_SCORE;

  return {
    ...state,
    score,
    shots: state.shots + 1,
    status: won ? 'won' : 'running',
    finishedAt: won ? now : 0,
  };
}

export function recordEscape(state) {
  if (state.status !== 'running') return state;
  return { ...state, misses: state.misses + 1 };
}

export function progressPercent(score) {
  return clamp((score / TARGET_SCORE) * 100, 0, 100);
}

export function elapsedSeconds(state, now = Date.now()) {
  if (!state.startedAt) return 0;
  const end = state.finishedAt || now;
  return Math.max(0, (end - state.startedAt) / 1000);
}
