export const TARGET_CASES = 40;
export const FINAL_STAGE_CASES = 35;
export const FINAL_BOSS_HITS = TARGET_CASES - FINAL_STAGE_CASES;
export const ROUND_SECONDS = 300;
export const QUIZ_CHANCE = 0.3;
export const FLOW_THRESHOLD = 100;

export const STAGES = Object.freeze([
  Object.freeze({ id: 1, name: 'Innboksen våkner', subtitle: 'Finn rytmen', from: 0, to: 5 }),
  Object.freeze({ id: 2, name: 'Førstelinjetrykk', subtitle: 'Prioriter før køen vokser', from: 5, to: 10 }),
  Object.freeze({ id: 3, name: 'Integrasjonsstøy', subtitle: 'Ustabile baner og eldre saker', from: 10, to: 15 }),
  Object.freeze({ id: 4, name: 'Endringsvindu', subtitle: 'SLA-saker gir høy prestisje', from: 15, to: 20 }),
  Object.freeze({ id: 5, name: 'Produksjonspress', subtitle: 'Flere samtidige hendelser', from: 20, to: 25 }),
  Object.freeze({ id: 6, name: 'Kritisk drift', subtitle: 'Presisjon under belastning', from: 25, to: 30 }),
  Object.freeze({ id: 7, name: 'Regional samordning', subtitle: 'Hele købildet er i bevegelse', from: 30, to: 35 }),
  Object.freeze({ id: 8, name: 'Null restanse', subtitle: 'Lukk hovedhendelsen', from: 35, to: TARGET_CASES }),
]);

export const TARGET_BASE_POINTS = Object.freeze({
  normal: 100,
  legacy: 125,
  priority: 165,
  sla: 230,
  critical: 260,
});

export const MISSION_CATALOG = Object.freeze({
  queue: Object.freeze({ label: 'Køknuser', detail: 'Løs 12 saker', reward: 450, target: 12 }),
  streak: Object.freeze({ label: 'Ren arbeidsflyt', detail: 'Treff 8 på rad', reward: 550, target: 8 }),
  noark: Object.freeze({ label: 'Faglig kontroll', detail: 'Svar riktig på 3 Noark-spørsmål', reward: 500, target: 3 }),
  precision: Object.freeze({ label: 'Presisjonsvakt', detail: 'Minst 82 % etter 15 skudd', reward: 600, target: 82 }),
  flow: Object.freeze({ label: 'Flytsone', detail: 'Aktiver Saksflyt 3 ganger', reward: 500, target: 3 }),
  priority: Object.freeze({ label: 'Prioriteringsmester', detail: 'Lukk 7 prioritetssaker', reward: 500, target: 7 }),
  perfect: Object.freeze({ label: 'Midt i saken', detail: 'Få 8 presisjonstreff', reward: 550, target: 8 }),
  control: Object.freeze({ label: 'SLA-vokter', detail: 'Nå 30 saker med maks 4 eskaleringer', reward: 650, target: 30 }),
  boss: Object.freeze({ label: 'Hendelsesleder', detail: 'Lukk hovedhendelsen', reward: 800, target: FINAL_BOSS_HITS }),
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function shouldOfferQuiz(randomValue = Math.random(), chance = QUIZ_CHANCE) {
  const normalizedChance = clamp(Number(chance) || 0, 0, 1);
  return Number.isFinite(randomValue) && randomValue >= 0 && randomValue < normalizedChance;
}

export function stageForCases(casesSolved) {
  const solved = clamp(Number(casesSolved) || 0, 0, TARGET_CASES);
  for (let index = STAGES.length - 1; index >= 0; index -= 1) {
    if (solved >= STAGES[index].from) return STAGES[index].id;
  }
  return 1;
}

export function stageProgressPercent(casesSolved, stage = stageForCases(casesSolved)) {
  const definition = STAGES[clamp(stage, 1, STAGES.length) - 1];
  const span = Math.max(1, definition.to - definition.from);
  return clamp(((casesSolved - definition.from) / span) * 100, 0, 100);
}

export function comboMultiplier(streak) {
  return clamp(1 + Math.max(0, streak - 1) * 0.075, 1, 2.25);
}

export function hitScore({
  kind = 'normal',
  streak = 1,
  precision = 0,
  scoreMultiplier = 1,
  perfectMultiplier = 1,
} = {}) {
  const base = TARGET_BASE_POINTS[kind] || TARGET_BASE_POINTS.normal;
  const accuracy = clamp(Number(precision) || 0, 0, 1);
  const precisionBonus = base * 0.42 * accuracy * (accuracy >= 0.82 ? perfectMultiplier : 1);
  return Math.max(1, Math.round((base + precisionBonus) * comboMultiplier(streak) * Math.max(0.1, scoreMultiplier)));
}

export function createGameState() {
  return {
    status: 'idle',
    casesSolved: 0,
    score: 0,
    shots: 0,
    hits: 0,
    escalations: 0,
    streak: 0,
    bestStreak: 0,
    quizOffered: 0,
    quizAnswered: 0,
    quizCorrect: 0,
    stage: 1,
    flow: 0,
    flowActivations: 0,
    perfectHits: 0,
    priorityHits: 0,
    legacyHits: 0,
    slaHits: 0,
    bossHits: 0,
    shieldsUsed: 0,
    comboGuardsUsed: 0,
    missionScore: 0,
    stageScore: 0,
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
    perfectHit: false,
    guardUsed: false,
    scoreGain: 0,
  };
}

export function resolveShot(
  state,
  {
    hit = false,
    now = Date.now(),
    randomValue = Math.random(),
    quizChance = QUIZ_CHANCE,
    kind = 'normal',
    precision = 0,
    scoreMultiplier = 1,
    perfectMultiplier = 1,
    flowMultiplier = 1,
    protectStreak = false,
    bossHit = false,
  } = {},
) {
  if (state.status !== 'running') return { state, events: emptyShotEvents() };

  const shots = state.shots + 1;
  if (!hit) {
    const guardUsed = Boolean(protectStreak && state.streak > 0);
    return {
      state: {
        ...state,
        shots,
        streak: guardUsed ? state.streak : 0,
        flow: Math.max(0, state.flow - (guardUsed ? 10 : 28)),
        comboGuardsUsed: state.comboGuardsUsed + (guardUsed ? 1 : 0),
      },
      events: { ...emptyShotEvents(), guardUsed },
    };
  }

  const casesSolved = clamp(state.casesSolved + 1, 0, TARGET_CASES);
  const streak = state.streak + 1;
  const nextStage = stageForCases(casesSolved);
  const won = casesSolved === TARGET_CASES;
  const quizTriggered = !won && shouldOfferQuiz(randomValue, quizChance);
  const normalizedPrecision = clamp(Number(precision) || 0, 0, 1);
  const perfectHit = normalizedPrecision >= 0.82;
  const scoreGain = hitScore({ kind, streak, precision: normalizedPrecision, scoreMultiplier, perfectMultiplier });
  const flowGain = (14 + Math.min(streak, 10) * 1.7 + (perfectHit ? 4 : 0)) * Math.max(0.25, flowMultiplier);
  const accumulatedFlow = state.flow + flowGain;
  const flowActivated = accumulatedFlow >= FLOW_THRESHOLD;
  const flow = flowActivated ? accumulatedFlow - FLOW_THRESHOLD : accumulatedFlow;

  const nextState = {
    ...state,
    status: won ? 'won' : 'running',
    casesSolved,
    score: state.score + scoreGain,
    shots,
    hits: state.hits + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    quizOffered: state.quizOffered + (quizTriggered ? 1 : 0),
    stage: nextStage,
    flow,
    flowActivations: state.flowActivations + (flowActivated ? 1 : 0),
    perfectHits: state.perfectHits + (perfectHit ? 1 : 0),
    priorityHits: state.priorityHits + (kind === 'priority' ? 1 : 0),
    legacyHits: state.legacyHits + (kind === 'legacy' ? 1 : 0),
    slaHits: state.slaHits + (kind === 'sla' ? 1 : 0),
    bossHits: state.bossHits + (bossHit ? 1 : 0),
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
      perfectHit,
      guardUsed: false,
      scoreGain,
    },
  };
}

export function recordEscape(state, { shielded = false } = {}) {
  if (state.status !== 'running') return state;
  if (shielded) {
    return {
      ...state,
      flow: Math.max(0, state.flow - 8),
      shieldsUsed: state.shieldsUsed + 1,
    };
  }
  return {
    ...state,
    escalations: state.escalations + 1,
    streak: 0,
    flow: Math.max(0, state.flow - 22),
  };
}

export function recordQuizAnswer(state, correct, { reward = 300, penalty = 125 } = {}) {
  if (state.status !== 'running') return state;
  return {
    ...state,
    score: Math.max(0, state.score + (correct ? reward : -penalty)),
    quizAnswered: state.quizAnswered + 1,
    quizCorrect: state.quizCorrect + (correct ? 1 : 0),
  };
}

export function awardScore(state, amount, source = 'bonus') {
  if (!Number.isFinite(amount) || amount === 0) return state;
  const value = Math.round(amount);
  return {
    ...state,
    score: Math.max(0, state.score + value),
    missionScore: source === 'mission' ? state.missionScore + Math.max(0, value) : state.missionScore,
    stageScore: source === 'stage' ? state.stageScore + Math.max(0, value) : state.stageScore,
  };
}

export function finishByTimeout(state, now = Date.now()) {
  if (state.status !== 'running') return state;
  return { ...state, status: 'timeout', finishedAt: now, streak: 0 };
}

export function progressPercent(casesSolved) {
  return clamp((casesSolved / TARGET_CASES) * 100, 0, 100);
}

export function accuracyPercent(state) {
  if (!state.shots) return 0;
  return clamp((state.hits / state.shots) * 100, 0, 100);
}

export function elapsedSeconds(state, now = Date.now()) {
  if (!state.startedAt) return 0;
  const end = state.finishedAt || now;
  return Math.max(0, (end - state.startedAt) / 1000);
}

export function remainingSeconds(state, now = Date.now(), roundSeconds = ROUND_SECONDS) {
  return Math.max(0, roundSeconds - elapsedSeconds(state, now));
}

export function missionStatus(state, missionId) {
  const definition = MISSION_CATALOG[missionId];
  if (!definition) return null;
  const accuracy = accuracyPercent(state);
  let current = 0;
  let complete = false;

  switch (missionId) {
    case 'queue': current = state.casesSolved; complete = current >= 12; break;
    case 'streak': current = state.bestStreak; complete = current >= 8; break;
    case 'noark': current = state.quizCorrect; complete = current >= 3; break;
    case 'precision': current = Math.round(accuracy); complete = state.shots >= 15 && accuracy >= 82; break;
    case 'flow': current = state.flowActivations; complete = current >= 3; break;
    case 'priority': current = state.priorityHits; complete = current >= 7; break;
    case 'perfect': current = state.perfectHits; complete = current >= 8; break;
    case 'control': current = state.casesSolved; complete = state.casesSolved >= 30 && state.escalations <= 4; break;
    case 'boss': current = state.bossHits; complete = current >= FINAL_BOSS_HITS; break;
    default: break;
  }

  return {
    id: missionId,
    ...definition,
    current: clamp(current, 0, definition.target),
    complete,
    percent: clamp((current / definition.target) * 100, 0, 100),
  };
}

export function unlockedMissions(state, missionIds = Object.keys(MISSION_CATALOG)) {
  return Object.fromEntries(missionIds.map((id) => [id, Boolean(missionStatus(state, id)?.complete)]));
}

export function missionCount(state, missionIds = Object.keys(MISSION_CATALOG)) {
  return Object.values(unlockedMissions(state, missionIds)).filter(Boolean).length;
}

export function performanceRank(state, missionIds = []) {
  const accuracy = accuracyPercent(state);
  const missions = missionCount(state, missionIds);
  const completed = state.status === 'won';

  if (completed && state.score >= 10_000 && accuracy >= 86 && state.escalations <= 2 && missions >= 3) {
    return { grade: 'SS', title: 'Operasjonell legende', detail: 'Nær perfekt vakt. Dette blir det snakk om ved kaffemaskinen.' };
  }
  if (completed && state.score >= 8_000 && accuracy >= 78 && state.escalations <= 4) {
    return { grade: 'S', title: 'Driftslegende', detail: 'Eksepsjonell flyt, presisjon og kontroll.' };
  }
  if (completed && state.score >= 6_400) {
    return { grade: 'A', title: 'Senior problemløser', detail: 'Sterk vakt med kontroll på hele købildet.' };
  }
  if (completed || state.casesSolved >= 32) {
    return { grade: 'B', title: 'Regional køfører', detail: 'Solid leveranse under tydelig produksjonspress.' };
  }
  if (state.casesSolved >= 22) {
    return { grade: 'C', title: 'Stabil saksbehandler', detail: 'God fremdrift. Null restanse er innen rekkevidde.' };
  }
  return { grade: 'D', title: 'Vakten er påbegynt', detail: 'Køen vant denne runden. Neste forsøk starter med erfaring.' };
}

export function experienceAward(state, missionIds = []) {
  const rank = performanceRank(state, missionIds);
  const rankBonus = { SS: 260, S: 210, A: 160, B: 110, C: 70, D: 35 }[rank.grade] || 35;
  const missionBonus = missionCount(state, missionIds) * 55;
  return Math.max(30, Math.round(state.casesSolved * 8 + state.score / 38 + missionBonus + rankBonus));
}
