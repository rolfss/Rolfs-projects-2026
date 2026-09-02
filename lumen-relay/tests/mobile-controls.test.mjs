import assert from 'node:assert/strict';
import test from 'node:test';

import { keysForStick } from '../mobile-controls.mjs';

function sortedKeys(x, y, deadZone) {
  return [...keysForStick(x, y, deadZone)].sort();
}

test('the stick dead zone produces no movement', () => {
  assert.deepEqual(sortedKeys(0, 0), []);
  assert.deepEqual(sortedKeys(0.2, -0.2), []);
});

test('the stick maps cardinal directions to WASD', () => {
  assert.deepEqual(sortedKeys(0, -1), ['w']);
  assert.deepEqual(sortedKeys(0, 1), ['s']);
  assert.deepEqual(sortedKeys(-1, 0), ['a']);
  assert.deepEqual(sortedKeys(1, 0), ['d']);
});

test('the stick supports diagonal movement', () => {
  assert.deepEqual(sortedKeys(0.8, -0.8), ['d', 'w']);
  assert.deepEqual(sortedKeys(-0.8, 0.8), ['a', 's']);
});

test('invalid values fail safely', () => {
  assert.deepEqual(sortedKeys(Number.NaN, Number.POSITIVE_INFINITY), []);
});
