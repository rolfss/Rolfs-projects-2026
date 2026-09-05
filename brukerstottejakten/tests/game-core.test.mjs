import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUIZ_CHANCE,
  TARGET_CASES,
  accuracyPercent,
  createGameState,
  elapsedSeconds,
  missionCount,
  performanceRank,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  resolveShot,
  shouldOfferQuiz,
  stageForCases,
  startGame,
  unlockedMissions,
} from '../game-core.js';

function hit(state, randomValue = 0.99, now = Date.now()) {
  return resolveShot(state, { hit: true, randomValue, now });
}

test('en ny vakt starter med ren spilltilstand', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(state.status, 'running');
  assert.equal(state.casesSolved, 0);
  assert.equal(state.points, 0);
  assert.equal(state.stage, 1);
  assert.equal(state.startedAt, 1_000);
});

test('bom teller skudd, bryter treffrekken og reduserer saksflyt', () => {
  let state = startGame(createGameState());
  state = { ...state, streak: 3, flow: 80 };
  const result = resolveShot(state, { hit: false });
  assert.equal(result.state.shots, 1);
  assert.equal(result.state.streak, 0);
  assert.equal(result.state.flow, 46);
  assert.equal(result.events.quizTriggered, false);
});

test('treff løser én sak, gir ett poeng og kan utløse quiz', () => {
  const state = startGame(createGameState());
  const result = hit(state, 0.12);
  assert.equal(result.state.casesSolved, 1);
  assert.equal(result.state.points, 1);
  assert.equal(result.state.quizOffered, 1);
  assert.equal(result.events.quizTriggered, true);
});

test('quizsannsynligheten har en presis 30-prosentgrense', () => {
  assert.equal(QUIZ_CHANCE, 0.3);
  assert.equal(shouldOfferQuiz(0), true);
  assert.equal(shouldOfferQuiz(0.299999), true);
  assert.equal(shouldOfferQuiz(0.3), false);
  assert.equal(shouldOfferQuiz(0.999), false);
  assert.equal(shouldOfferQuiz(-0.1), false);
  assert.equal(shouldOfferQuiz(Number.NaN), false);
});

test('bare vellykkede treff kan utløse quiz', () => {
  const state = startGame(createGameState());
  const miss = resolveShot(state, { hit: false, randomValue: 0 });
  const successful = resolveShot(state, { hit: true, randomValue: 0 });
  assert.equal(miss.events.quizTriggered, false);
  assert.equal(successful.events.quizTriggered, true);
});

test('automatisk saksflyt aktiveres etter en sterk treffrekke', () => {
  let state = startGame(createGameState());
  let result = hit(state);
  state = result.state;
  result = hit(state);
  state = result.state;
  result = hit(state);
  assert.equal(result.events.flowActivated, true);
  assert.equal(result.state.flowActivations, 1);
  assert.equal(result.state.flow, 14);
  assert.equal(result.state.bestStreak, 3);
});

test('operative faser følger antall løste saker', () => {
  assert.deepEqual(
    [stageForCases(0), stageForCases(2), stageForCases(3), stageForCases(6), stageForCases(9), stageForCases(10)],
    [1, 1, 2, 3, 4, 4],
  );
});

test('ti faktiske treff gir alltid seier, uavhengig av quiz', () => {
  let state = startGame(createGameState(), 2_000);
  for (let index = 0; index < TARGET_CASES; index += 1) {
    state = hit(state, 0, 5_000).state;
  }
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.points, TARGET_CASES);
  assert.equal(state.finishedAt, 5_000);
  assert.equal(state.quizOffered, TARGET_CASES - 1);
});

test('det siste treffet forsinker ikke seier med en ny quiz', () => {
  let state = startGame(createGameState());
  for (let index = 0; index < TARGET_CASES - 1; index += 1) state = hit(state, 0.99).state;
  const final = hit(state, 0);
  assert.equal(final.events.won, true);
  assert.equal(final.events.quizTriggered, false);
  assert.equal(final.state.status, 'won');
});

test('Noark-svar gir pluss eller minus ett poeng uten negativ totalscore', () => {
  let state = startGame(createGameState());
  state = recordQuizAnswer(state, false);
  assert.equal(state.points, 0);
  state = hit(state).state;
  state = recordQuizAnswer(state, false);
  assert.equal(state.points, 0);
  state = recordQuizAnswer(state, true);
  assert.equal(state.points, 1);
  assert.equal(state.quizAnswered, 3);
  assert.equal(state.quizCorrect, 1);
});

test('eskaleringer bryter treffrekken og reduserer flyt', () => {
  let state = startGame(createGameState());
  state = { ...state, streak: 4, flow: 55 };
  state = recordEscape(state);
  assert.equal(state.escalations, 1);
  assert.equal(state.streak, 0);
  assert.equal(state.flow, 35);
});

test('fremdrift, presisjon og tid beregnes konsistent', () => {
  let state = startGame(createGameState(), 1_000);
  state = hit(state).state;
  state = resolveShot(state, { hit: false }).state;
  assert.equal(progressPercent(5), 50);
  assert.equal(progressPercent(99), 100);
  assert.equal(accuracyPercent(state), 50);
  assert.equal(elapsedSeconds({ ...state, finishedAt: 4_500 }, 9_000), 3.5);
});

test('utmerkelser låses opp av konkrete prestasjoner', () => {
  let state = startGame(createGameState());
  for (let index = 0; index < 7; index += 1) state = hit(state).state;
  state = recordQuizAnswer(state, true);
  state = recordQuizAnswer(state, true);
  const missions = unlockedMissions(state);
  assert.deepEqual(missions, { queue: true, streak: true, noark: true, precision: true, control: true });
  assert.equal(missionCount(state), 5);
});

test('rang S krever både bonuspoeng, presisjon og kontroll', () => {
  const state = {
    ...startGame(createGameState()),
    status: 'won',
    casesSolved: 10,
    points: 12,
    shots: 11,
    escalations: 1,
    bestStreak: 7,
    quizCorrect: 2,
  };
  assert.deepEqual(performanceRank(state), {
    grade: 'S',
    title: 'Driftslegende',
    detail: 'Eksepsjonell flyt, presisjon og faglig kontroll.',
  });
});
