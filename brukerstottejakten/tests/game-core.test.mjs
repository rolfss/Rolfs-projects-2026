import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUIZ_TRIGGER_PROBABILITY,
  TARGET_CASES,
  accuracyPercent,
  createGameState,
  elapsedSeconds,
  levelForCases,
  missionCount,
  performanceGrade,
  progressPercent,
  recordEscape,
  recordQuizAnswer,
  recordShot,
  shouldTriggerQuiz,
  startGame,
  unlockedMissions,
} from '../game-core.js';

test('en ny vakt starter rent', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(state.status, 'running');
  assert.equal(state.casesSolved, 0);
  assert.equal(state.points, 0);
  assert.equal(state.startedAt, 1_000);
});

test('treff, bom og sakstyper registreres riktig', () => {
  let state = startGame(createGameState());
  state = recordShot(state, true, 1_100, 'priority');
  state = recordShot(state, true, 1_200, 'legacy');
  assert.equal(state.casesSolved, 2);
  assert.equal(state.points, 2);
  assert.equal(state.priorityHits, 1);
  assert.equal(state.legacyHits, 1);
  assert.equal(state.streak, 2);
  state = recordShot(state, false, 1_300);
  assert.equal(state.shots, 3);
  assert.equal(state.streak, 0);
});

test('ti faktiske treff gir seier uavhengig av quizpoeng', () => {
  let state = startGame(createGameState(), 2_000);
  state = recordQuizAnswer(state, true);
  for (let index = 0; index < TARGET_CASES; index += 1) {
    state = recordShot(state, true, 5_000 + index);
  }
  assert.equal(state.status, 'won');
  assert.equal(state.casesSolved, TARGET_CASES);
  assert.equal(state.points, TARGET_CASES + 1);
  assert.equal(state.finishedAt, 5_009);
});

test('quiz utløses bare av treff og ved roll under 30 prosent', () => {
  assert.equal(QUIZ_TRIGGER_PROBABILITY, 0.3);
  assert.equal(shouldTriggerQuiz(true, 0), true);
  assert.equal(shouldTriggerQuiz(true, 0.299999), true);
  assert.equal(shouldTriggerQuiz(true, 0.3), false);
  assert.equal(shouldTriggerQuiz(false, 0.01), false);
  assert.equal(shouldTriggerQuiz(true, 0.01, true), false);
});

test('quizpoeng kan aldri bli negative', () => {
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

test('nivåer og fremdrift følger løste saker', () => {
  assert.deepEqual([levelForCases(0), levelForCases(3), levelForCases(6), levelForCases(9)], [1, 2, 3, 4]);
  assert.equal(progressPercent(-2), 0);
  assert.equal(progressPercent(5), 50);
  assert.equal(progressPercent(99), 100);
});

test('statistikk og delmål beregnes konsistent', () => {
  let state = startGame(createGameState(), 1_000);
  for (let index = 0; index < 8; index += 1) {
    state = recordShot(state, true, 2_000 + index, index === 2 ? 'priority' : 'normal');
  }
  state = recordEscape(state);
  state = recordQuizAnswer(state, true);
  state = recordQuizAnswer(state, true);
  assert.equal(accuracyPercent(state), 100);
  assert.equal(elapsedSeconds({ ...state, finishedAt: 4_500 }, 9_000), 3.5);
  assert.deepEqual(unlockedMissions(state), {
    triage: true,
    flow: true,
    priority: true,
    noark: true,
    control: true,
  });
  assert.equal(missionCount(state), 5);
});

test('prestasjonsscore gir en stabil karakter', () => {
  let state = startGame(createGameState(), 0);
  for (let index = 0; index < 10; index += 1) state = recordShot(state, true, 40_000, index === 1 ? 'priority' : 'normal');
  state = recordQuizAnswer(state, true);
  state = recordQuizAnswer(state, true);
  const result = performanceGrade(state, 40_000);
  assert.equal(result.grade, 'S');
  assert.equal(result.title, 'Driftslegende');
});
