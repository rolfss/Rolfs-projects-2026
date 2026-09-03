import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUIZ_CHANCE,
  QUIZ_MILESTONES,
  TARGET_CASES,
  accuracyPercent,
  createGameState,
  elapsedSeconds,
  levelForCases,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  recordShot,
  shouldOfferQuiz,
  startGame,
  unlockedMissions,
} from '../game-core.js';

test('en ny vakt starter med ren spilltilstand', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(state.status, 'running');
  assert.equal(state.casesSolved, 0);
  assert.equal(state.points, 0);
  assert.equal(state.startedAt, 1_000);
});

test('treff og bom oppdaterer saker, poeng, skudd og komboserie', () => {
  let state = startGame(createGameState());
  state = recordShot(state, true, Date.now(), 0.9);
  state = recordShot(state, true, Date.now(), 0.9);
  assert.equal(state.casesSolved, 2);
  assert.equal(state.points, 2);
  assert.equal(state.streak, 2);
  state = recordShot(state, false, Date.now(), 0.1);
  assert.equal(state.shots, 3);
  assert.equal(state.streak, 0);
});

test('quizsannsynligheten er nøyaktig 30 prosent', () => {
  assert.equal(QUIZ_CHANCE, 0.3);
  assert.equal(shouldOfferQuiz(0), true);
  assert.equal(shouldOfferQuiz(0.299999), true);
  assert.equal(shouldOfferQuiz(0.3), false);
  assert.equal(shouldOfferQuiz(0.999999), false);
});

test('bare et vellykket treff kan gjøre en tilfeldig quiz klar', () => {
  let state = startGame(createGameState());
  state = recordShot(state, false, 2_000, 0.01);
  assert.equal(QUIZ_MILESTONES[0], Number.POSITIVE_INFINITY);

  state = recordShot(state, true, 3_000, 0.29);
  assert.equal(state.casesSolved, 1);
  assert.equal(QUIZ_MILESTONES[0], 1);

  state = recordShot(state, true, 4_000, 0.3);
  assert.equal(QUIZ_MILESTONES[1], Number.POSITIVE_INFINITY);
});

test('quizvisningen støtter et tilfeldig antall spørsmål per vakt', () => {
  assert.equal(String(QUIZ_MILESTONES.length), '?');
  assert.deepEqual(['a', 'b', 'c'].slice(0, QUIZ_MILESTONES.length), ['a', 'b', 'c']);
});

test('ti faktiske treff gir seier, uavhengig av bonuspoeng', () => {
  let state = startGame(createGameState(), 2_000);
  state = recordQuizAnswer(state, true);
  for (let index = 0; index < TARGET_CASES; index += 1) {
    state = recordShot(state, true, 5_000, 0.9);
  }
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.points, TARGET_CASES + 1);
  assert.equal(state.finishedAt, 5_000);
});

test('Noark-svar gir pluss eller minus ett poeng, men aldri negativ totalscore', () => {
  let state = startGame(createGameState());
  state = recordQuizAnswer(state, false);
  assert.equal(state.points, 0);
  state = recordShot(state, true, Date.now(), 0.9);
  state = recordQuizAnswer(state, false);
  assert.equal(state.points, 0);
  state = recordQuizAnswer(state, true);
  assert.equal(state.points, 1);
  assert.equal(state.quizAnswered, 3);
  assert.equal(state.quizCorrect, 1);
});

test('nivå og fremdrift følger antall løste saker', () => {
  assert.deepEqual([levelForCases(0), levelForCases(3), levelForCases(6), levelForCases(9)], [1, 2, 3, 4]);
  assert.equal(progressPercent(-2), 0);
  assert.equal(progressPercent(5), 50);
  assert.equal(progressPercent(99), 100);
});

test('statistikk, eskaleringer og delmål beregnes konsistent', () => {
  let state = startGame(createGameState(), 1_000);
  for (let index = 0; index < 6; index += 1) state = recordShot(state, true, Date.now(), 0.9);
  state = recordEscape(state);
  state = recordQuizAnswer(state, true);
  state = recordQuizAnswer(state, true);
  assert.equal(accuracyPercent(state), 100);
  assert.equal(elapsedSeconds({ ...state, finishedAt: 4_500 }, 9_000), 3.5);
  assert.deepEqual(unlockedMissions(state), { warmup: true, flow: true, noark: true, control: true });
});
