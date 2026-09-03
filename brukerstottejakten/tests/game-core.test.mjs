import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_CASES,
  accuracyPercent,
  createGameState,
  elapsedSeconds,
  levelForCases,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  recordShot,
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
  state = recordShot(state, true);
  state = recordShot(state, true);
  assert.equal(state.casesSolved, 2);
  assert.equal(state.points, 2);
  assert.equal(state.streak, 2);
  state = recordShot(state, false);
  assert.equal(state.shots, 3);
  assert.equal(state.streak, 0);
});

test('ti faktiske treff gir seier, uavhengig av bonuspoeng', () => {
  let state = startGame(createGameState(), 2_000);
  state = recordQuizAnswer(state, true);
  for (let index = 0; index < TARGET_CASES; index += 1) state = recordShot(state, true, 5_000);
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.points, TARGET_CASES + 1);
  assert.equal(state.finishedAt, 5_000);
});

test('Noark-svar gir pluss eller minus ett poeng, men aldri negativ totalscore', () => {
  let state = startGame(createGameState());
  state = recordQuizAnswer(state, false);
  assert.equal(state.points, 0);
  state = recordShot(state, true);
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
  for (let index = 0; index < 6; index += 1) state = recordShot(state, true);
  state = recordEscape(state);
  state = recordQuizAnswer(state, true);
  state = recordQuizAnswer(state, true);
  assert.equal(accuracyPercent(state), 100);
  assert.equal(elapsedSeconds({ ...state, finishedAt: 4_500 }, 9_000), 3.5);
  assert.deepEqual(unlockedMissions(state), { warmup: true, flow: true, noark: true, control: true });
});
