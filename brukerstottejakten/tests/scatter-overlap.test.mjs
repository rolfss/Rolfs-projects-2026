import test from 'node:test';
import assert from 'node:assert/strict';
import { weaponGeometry, weaponTargets } from '../combat-boosters.js';

const rectangle = (id, x, y) => ({
  id, kind: 'normal',
  screen: { polygon: [{ x: x - 12, y: y - 12 }, { x: x + 12, y: y - 12 }, { x: x + 12, y: y + 12 }, { x: x - 12, y: y + 12 }] },
});
const renderer = {
  width: 1000,
  hitTest(targets, x, y) {
    return targets.find(t => x >= t.screen.polygon[0].x && x <= t.screen.polygon[1].x && y >= t.screen.polygon[0].y && y <= t.screen.polygon[2].y) || null;
  },
};

test('overlapping central cases cannot add a fourth scattershot contact', () => {
  const points = weaponGeometry('scatter', 500, 300, 1000).points;
  const front = rectangle(1, 500, 300);
  const behind = rectangle(2, 500, 300);
  const left = rectangle(3, points[1].x, points[1].y);
  const right = rectangle(4, points[2].x, points[2].y);
  assert.deepEqual(weaponTargets(renderer, [front, behind, left, right], 500, 300, 'scatter'), [front, left, right]);
});

