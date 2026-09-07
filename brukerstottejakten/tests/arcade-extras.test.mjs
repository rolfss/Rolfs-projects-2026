import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, startGame } from '../game-core.js';
import { recordFruit, hitFruit, fruitScreen } from '../arcade-extras.js';

test('frukt gir bonus uten saker, skuddstatistikk, quiz eller komboserie', () => {
  const state = { ...startGame(createGameState()), queuePressure: 50, flow: 10, streak: 8 };
  for (const [kind, score, relief, flow] of [['orange', 250, 12, 0], ['melon', 150, 0, 30], ['pineapple', 200, 0, 0]]) {
    const result = recordFruit(state, kind);
    assert.equal(result.collected, true);
    assert.deepEqual(result.state, { ...state, score: state.score + score, queuePressure: 50 - relief, flow: 10 + flow });
    assert.equal(result.rechargePulse, kind === 'pineapple');
  }
});

test('melon utløser Saksflyt én gang og beholder overskytende flyt', () => {
  const state = { ...startGame(createGameState()), flow: 85, flowActivations: 2 };
  const result = recordFruit(state, 'melon');
  assert.equal(result.flowActivated, true);
  assert.equal(result.state.flow, 15);
  assert.equal(result.state.flowActivations, 3);
});

test('frukt respekterer nullgrensen og inaktivt spill', () => {
  const started = { ...startGame(createGameState()), queuePressure: 5 };
  assert.equal(recordFruit(started, 'orange').state.queuePressure, 0);
  assert.equal(recordFruit(started, 'unknown').state, started);
  for (const status of ['idle', 'won']) {
    const state = { ...started, status };
    assert.equal(recordFruit(state, 'melon').state, state);
    assert.equal(recordFruit(state, 'melon').collected, false);
  }
});

test('frukttreff følger synlig gulvposisjon ved vindusendring, uten dobbel belønning', () => {
  const fruit = { x: .6, lane: .5 };
  for (const [width, height] of [[1440, 900], [390, 760], [800, 300]]) {
    const screen = fruitScreen(fruit, width, height);
    assert.equal(hitFruit([fruit], screen.x, screen.y, width, height), fruit);
    assert.equal(hitFruit([fruit], screen.x + screen.radius + 9, screen.y, width, height), null);
    assert.equal(hitFruit([{ ...fruit, resolving: true }], screen.x, screen.y, width, height), null);
    assert.equal(hitFruit([{ ...fruit, dead: true }], screen.x, screen.y, width, height), null);
    assert.ok(screen.y > height * .63);
  }
});
