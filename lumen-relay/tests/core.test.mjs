import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseSpawnPoint,
  circlesOverlap,
  clamp,
  deliveryScore,
  difficultyFor,
  formatScore,
  mulberry32,
  normalize,
} from '../core.mjs';

test('clamp holder verdier innenfor et intervall', () => {
  assert.equal(clamp(-4, 0, 10), 0);
  assert.equal(clamp(14, 0, 10), 10);
  assert.equal(clamp(6, 0, 10), 6);
});

test('normalize håndterer både nullvektor og vanlige vektorer', () => {
  assert.deepEqual(normalize(0, 0), { x: 0, y: 0, length: 0 });
  const vector = normalize(3, 4);
  assert.equal(vector.length, 5);
  assert.equal(vector.x, 0.6);
  assert.equal(vector.y, 0.8);
});

test('seedet tilfeldig generator gir samme resultat hver gang', () => {
  const left = mulberry32(42);
  const right = mulberry32(42);
  assert.deepEqual([left(), left(), left()], [right(), right(), right()]);
});

test('vanskelighetsgraden øker i bølger og holder seg innenfor grensene', () => {
  assert.equal(difficultyFor(0).wave, 1);
  assert.equal(difficultyFor(5).wave, 2);
  assert.equal(difficultyFor(250).interferenceCount, 10);
  assert.ok(difficultyFor(250).packetInterval >= 1.15);
});

test('poengsystemet belønner fart og lengre rekker', () => {
  const quick = deliveryScore({ combo: 0, lifetime: 10, maxLifetime: 10 });
  const late = deliveryScore({ combo: 0, lifetime: 1, maxLifetime: 10 });
  const streak = deliveryScore({ combo: 4, lifetime: 10, maxLifetime: 10 });
  assert.ok(quick.points > late.points);
  assert.ok(streak.points > quick.points);
  assert.equal(streak.nextCombo, 5);
});

test('sirkelkollisjon tar hensyn til radius og ekstra klaring', () => {
  const a = { x: 0, y: 0, radius: 5 };
  const b = { x: 11, y: 0, radius: 5 };
  assert.equal(circlesOverlap(a, b), false);
  assert.equal(circlesOverlap(a, b, 1), true);
});

test('formatScore gir en stabil og lesbar poengsum', () => {
  assert.equal(formatScore(12345.4).replace(/\s/g, ' '), '12 345');
  assert.equal(formatScore(-1), '0');
});

test('nye fragmenter unngår sperresoner når det finnes plass', () => {
  const random = mulberry32(7);
  const point = chooseSpawnPoint({
    width: 900,
    height: 600,
    random,
    avoid: [{ x: 450, y: 300, radius: 100, clearance: 120 }],
  });
  assert.ok(point.x >= 80 && point.x <= 820);
  assert.ok(point.y >= 80 && point.y <= 520);
  assert.ok(Math.hypot(point.x - 450, point.y - 300) >= 220);
});
