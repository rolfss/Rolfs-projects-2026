import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_SCORE,
  createGameState,
  elapsedSeconds,
  progressPercent,
  recordEscape,
  recordShot,
  startGame,
} from '../game-core.js';

test('a new game starts cleanly', () => {
  const state = startGame(createGameState(), 1_000);
  assert.equal(state.status, 'running');
  assert.equal(state.score, 0);
  assert.equal(state.shots, 0);
  assert.equal(state.startedAt, 1_000);
});

test('a hit adds one solved case and one shot', () => {
  const state = recordShot(startGame(createGameState()), true);
  assert.equal(state.score, 1);
  assert.equal(state.shots, 1);
});

test('a miss adds a shot but no score', () => {
  const state = recordShot(startGame(createGameState()), false);
  assert.equal(state.score, 0);
  assert.equal(state.shots, 1);
});

test('ten hits win the game and the score cannot exceed ten', () => {
  let state = startGame(createGameState(), 2_000);
  for (let i = 0; i < TARGET_SCORE + 3; i += 1) {
    state = recordShot(state, true, 5_000);
  }
  assert.equal(state.status, 'won');
  assert.equal(state.score, TARGET_SCORE);
  assert.equal(state.shots, TARGET_SCORE);
  assert.equal(state.finishedAt, 5_000);
});

test('escaped cases are counted while the game runs', () => {
  const state = recordEscape(startGame(createGameState()));
  assert.equal(state.misses, 1);
});

test('progress and elapsed time are clamped and calculated', () => {
  assert.equal(progressPercent(-2), 0);
  assert.equal(progressPercent(5), 50);
  assert.equal(progressPercent(99), 100);
  assert.equal(elapsedSeconds({ startedAt: 1_000, finishedAt: 4_500 }, 9_000), 3.5);
});
