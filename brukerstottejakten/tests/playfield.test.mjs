import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneRenderer } from '../renderer-base.js';

test('hele sakens treffområde holder seg mellom instrumentpanelet og gulvet', () => {
  const renderer = Object.create(SceneRenderer.prototype);
  renderer.cameraX = 0;
  renderer.cameraY = 0;
  for (const [width, height, flightTop] of [[1404, 803, 179], [378, 782, 128], [832, 330, 106]]) {
    Object.assign(renderer, { width, height, flightTop });
    for (const y of [-2, 1, 3, 5, 8]) for (const z of [-13.5, -4.8]) {
      for (const [width, height] of [[2.15, .86], [5.4, 2.25]]) {
        const target = { x: 0, y, z, width, height, depth: .62, yaw: .22, bank: .09 };
        target.screen = renderer.computeTargetScreen(target);
        assert.ok(target.screen.bounds.top >= flightTop);
        assert.ok(target.screen.bounds.bottom <= renderer.height * .60);
        const { x: cx, y: cy } = target.screen.center;
        assert.equal(renderer.hitTest([target], cx, cy), target);
        assert.equal(renderer.hitTest([target], cx, flightTop - 10), null);
      }
    }
  }
});
