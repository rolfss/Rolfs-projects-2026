import test from 'node:test';
import assert from 'node:assert/strict';
import {
  composeTransform,
  mat4Identity,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4TransformPoint,
  projectPoint,
  smoothstep,
  vec3,
} from '../math3d.js';

test('composeTransform flytter og skalerer punkter', () => {
  const matrix = composeTransform({ position: [2, 3, 4], scale: [2, 2, 2] });
  const out = vec3();
  mat4TransformPoint(out, matrix, [1, 1, 1]);
  assert.deepEqual([...out].map((value) => Math.round(value)), [4, 5, 6]);
});

test('perspektiv og lookAt projiserer senteret midt på skjermen', () => {
  const projection = mat4Perspective(new Float32Array(16), Math.PI / 3, 16 / 9, 0.1, 100);
  const view = mat4LookAt(new Float32Array(16), [0, 0, 5], [0, 0, 0], [0, 1, 0]);
  const viewProjection = mat4Multiply(new Float32Array(16), projection, view);
  const point = projectPoint([0, 0, 0], viewProjection, 1600, 900);
  assert.ok(point);
  assert.ok(Math.abs(point.x - 800) < 0.001);
  assert.ok(Math.abs(point.y - 450) < 0.001);
});

test('identitetsmatrise bevarer et punkt', () => {
  const out = vec3();
  mat4TransformPoint(out, mat4Identity(), [3, -2, 7]);
  assert.deepEqual([...out], [3, -2, 7]);
});

test('smoothstep er klamret og jevn', () => {
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
});
