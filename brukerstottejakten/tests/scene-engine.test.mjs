import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convexHull,
  createCuboidMesh,
  distanceToPolygon,
  pointInPolygon,
  polygonArea,
  projectPoint,
  rotatePoint,
  smoothstep,
} from '../scene-engine.js';

const camera = { x: 0, y: 2, z: 0, focal: 800, near: 0.25 };
const viewport = { width: 1200, height: 800, horizon: 430 };

test('perspektivprojeksjon plasserer et sentrert punkt i fluktpunktet', () => {
  const point = projectPoint({ x: 0, y: 2, z: 10 }, camera, viewport);
  assert.equal(point.visible, true);
  assert.equal(point.x, 600);
  assert.equal(point.y, 430);
  assert.equal(point.scale, 80);
});

test('punkter bak nærplanet er usynlige', () => {
  const point = projectPoint({ x: 0, y: 2, z: 0.1 }, camera, viewport);
  assert.equal(point.visible, false);
  assert.equal(point.scale, 0);
});

test('rotasjon uten vinkler beholder punktet', () => {
  assert.deepEqual(rotatePoint({ x: 1, y: 2, z: 3 }, {}), { x: 1, y: 2, z: 3 });
});

test('90 graders yaw flytter x-aksen inn i z-aksen', () => {
  const result = rotatePoint({ x: 1, y: 0, z: 0 }, { yaw: Math.PI / 2 });
  assert.ok(Math.abs(result.x) < 1e-10);
  assert.ok(Math.abs(result.z + 1) < 1e-10);
});

test('en kuboid gir åtte hjørner, seks flater og en treffbar silhuett', () => {
  const mesh = createCuboidMesh({
    center: { x: 0, y: 4, z: 10 },
    size: { x: 2, y: 1, z: 0.6 },
    rotation: { yaw: 0.15, pitch: 0.03, roll: -0.05 },
    camera,
    viewport,
  });
  assert.equal(mesh.worldVertices.length, 8);
  assert.equal(mesh.projectedVertices.length, 8);
  assert.equal(mesh.faces.length, 6);
  assert.ok(mesh.hull.length >= 4);
  assert.ok(Math.abs(polygonArea(mesh.hull)) > 100);
  const center = projectPoint({ x: 0, y: 4, z: 10 }, camera, viewport);
  assert.equal(pointInPolygon(center, mesh.hull), true);
});

test('punkt-i-polygon skiller innsiden fra utsiden', () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.equal(pointInPolygon({ x: 5, y: 5 }, square), true);
  assert.equal(pointInPolygon({ x: 12, y: 5 }, square), false);
  assert.equal(distanceToPolygon({ x: 12, y: 5 }, square), 2);
});

test('convex hull fjerner innvendige punkter', () => {
  const hull = convexHull([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
    { x: 5, y: 5 },
  ]);
  assert.equal(hull.length, 4);
});

test('smoothstep er klammet og monoton', () => {
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.ok(smoothstep(0, 1, 0.25) < smoothstep(0, 1, 0.75));
});
