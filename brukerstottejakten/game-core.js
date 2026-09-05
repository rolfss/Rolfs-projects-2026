export const TARGET_CASES = 10;
export const QUIZ_CHANCE = 0.3;
export const FLOW_THRESHOLD = 100;

export const STAGES = Object.freeze([
  Object.freeze({ id: 1, name: 'Morgenkø', subtitle: 'Få kontroll på innboksen', from: 0 }),
  Object.freeze({ id: 2, name: 'Produksjonspress', subtitle: 'Tempoet øker', from: 3 }),
  Object.freeze({ id: 3, name: 'Kritisk drift', subtitle: 'Prioriter riktig', from: 6 }),
  Object.freeze({ id: 4, name: 'Sluttspurten', subtitle: 'Lukk hovedhendelsen', from: 9 }),
]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function shouldOfferQuiz(randomValue = Math.random()) {
  return Number.isFinite(randomValue) && randomValue >= 0 && randomValue < QUIZ_CHANCE;
}

export function stageForCases(casesSolved) {
  const solved = clamp(Number(casesSolved) || 0, 0, TARGET_CASES);
  if (solved >= 9) return 4;
  if (solved >= 6) return 3;
  if (solved >= 3) return 2;
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
    quizOffered: 0,
    quizAnswered: 0,
    quizCorrect: 0,
    stage: 1,
    flow: 0,
    flowActivations: 0,
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

function emptyShotEvents() {
  return {
    hit: false,
    won: false,
    quizTriggered: false,
    stageChanged: false,
    flowActivated: false,
    pointsDelta: 0,
  };
}

export function resolveShot(
  state,
  {
    hit = false,
    now = Date.now(),
    randomValue = Math.random(),
  } = {},
) {
  if (state.status !== 'running') return { state, events: emptyShotEvents() };

  const shots = state.shots + 1;
  if (!hit) {
    return {
      state: {
        ...state,
        shots,
        streak: 0,
        flow: Math.max(0, state.flow - 34),
      },
      events: emptyShotEvents(),
    };
  }

  const casesSolved = clamp(state.casesSolved + 1, 0, TARGET_CASES);
  const streak = state.streak + 1;
  const nextStage = stageForCases(casesSolved);
  const won = casesSolved === TARGET_CASES;
  const quizTriggered = !won && shouldOfferQuiz(randomValue);
  const flowGain = 34 + Math.min(streak - 1, 4) * 4;
  const accumulatedFlow = state.flow + flowGain;
  const flowActivated = accumulatedFlow >= FLOW_THRESHOLD;
  const flow = flowActivated ? accumulatedFlow - FLOW_THRESHOLD : accumulatedFlow;

  const nextState = {
    ...state,
    status: won ? 'won' : 'running',
    casesSolved,
    points: state.points + 1,
    shots,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    quizOffered: state.quizOffered + (quizTriggered ? 1 : 0),
    stage: nextStage,
    flow,
    flowActivations: state.flowActivations + (flowActivated ? 1 : 0),
    finishedAt: won ? now : 0,
  };

  return {
    state: nextState,
    events: {
      hit: true,
      won,
      quizTriggered,
      stageChanged: nextStage !== state.stage,
      flowActivated,
      pointsDelta: 1,
    },
  };
}

export function recordEscape(state) {
  if (state.status !== 'running') return state;
  return {
    ...state,
    escalations: state.escalations + 1,
    streak: 0,
    flow: Math.max(0, state.flow - 20),
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
  const accuracy = accuracyPercent(state);
  return {
    queue: state.casesSolved >= 3,
    streak: state.bestStreak >= 4,
    noark: state.quizCorrect >= 2,
    precision: state.shots >= 5 && accuracy >= 80,
    control: state.casesSolved >= 7 && state.escalations <= 2,
  };
}

export function missionCount(state) {
  return Object.values(unlockedMissions(state)).filter(Boolean).length;
}

export function performanceRank(state) {
  const accuracy = accuracyPercent(state);
  const missions = missionCount(state);

  if (state.points >= 12 && accuracy >= 80 && state.escalations <= 2 && missions >= 4) {
    return { grade: 'S', title: 'Driftslegende', detail: 'Eksepsjonell flyt, presisjon og faglig kontroll.' };
  }
  if (state.points >= 10 && accuracy >= 70 && state.escalations <= 4) {
    return { grade: 'A', title: 'Senior problemløser', detail: 'Svært sterk vakt med kontroll på køen.' };
  }
  if (accuracy >= 55) {
    return { grade: 'B', title: 'Stabil saksbehandler', detail: 'God leveranse. Noen saker tok den lange veien.' };
  }
  return { grade: 'C', title: 'Vakten fullført', detail: 'Resultatet er godkjent. Treffbildet kan forbedres.' };
}
