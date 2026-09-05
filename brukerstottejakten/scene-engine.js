export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(value) {
  const t = clamp(value, 0, 1);
  return 1 - (1 - t) ** 3;
}

export function rotatePoint(point, rotation = {}) {
  const yaw = rotation.yaw || 0;
  const pitch = rotation.pitch || 0;
  const roll = rotation.roll || 0;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  let x = point.x;
  let y = point.y;
  let z = point.z;

  // Yaw around the vertical axis.
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  // Pitch around the horizontal axis.
  [y, z] = [y * cp - z * sp, y * sp + z * cp];
  // Roll in the screen plane.
  [x, y] = [x * cr - y * sr, x * sr + y * cr];

  return { x, y, z };
}

export function projectPoint(point, camera, viewport) {
  const relativeX = point.x - camera.x;
  const relativeY = point.y - camera.y;
  const relativeZ = point.z - camera.z;
  const near = camera.near ?? 0.3;

  if (relativeZ <= near) {
    return { x: 0, y: 0, scale: 0, depth: relativeZ, visible: false };
  }

  const focal = camera.focal;
  const scale = focal / relativeZ;
  return {
    x: viewport.width / 2 + relativeX * scale,
    y: viewport.horizon - relativeY * scale,
    scale,
    depth: relativeZ,
    visible: true,
  };
}

const CUBOID_FACES = Object.freeze([
  Object.freeze({ name: 'back', indices: [4, 7, 6, 5], light: 0.56 }),
  Object.freeze({ name: 'left', indices: [0, 3, 7, 4], light: 0.68 }),
  Object.freeze({ name: 'right', indices: [1, 5, 6, 2], light: 0.5 }),
  Object.freeze({ name: 'top', indices: [3, 2, 6, 7], light: 1.1 }),
  Object.freeze({ name: 'bottom', indices: [0, 4, 5, 1], light: 0.42 }),
  Object.freeze({ name: 'front', indices: [0, 1, 2, 3], light: 0.92 }),
]);

export function createCuboidMesh({ center, size, rotation, camera, viewport }) {
  const half = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
  const local = [
    { x: -half.x, y: -half.y, z: -half.z },
    { x: half.x, y: -half.y, z: -half.z },
    { x: half.x, y: half.y, z: -half.z },
    { x: -half.x, y: half.y, z: -half.z },
    { x: -half.x, y: -half.y, z: half.z },
    { x: half.x, y: -half.y, z: half.z },
    { x: half.x, y: half.y, z: half.z },
    { x: -half.x, y: half.y, z: half.z },
  ];

  const worldVertices = local.map((vertex) => {
    const rotated = rotatePoint(vertex, rotation);
    return {
      x: center.x + rotated.x,
      y: center.y + rotated.y,
      z: center.z + rotated.z,
    };
  });
  const projectedVertices = worldVertices.map((vertex) => projectPoint(vertex, camera, viewport));

  const faces = CUBOID_FACES.map((face) => {
    const world = face.indices.map((index) => worldVertices[index]);
    const points = face.indices.map((index) => projectedVertices[index]);
    const depth = world.reduce((sum, point) => sum + point.z, 0) / world.length;
    return { ...face, world, points, depth };
  }).sort((a, b) => b.depth - a.depth);

  return {
    worldVertices,
    projectedVertices,
    faces,
    hull: convexHull(projectedVertices.filter((point) => point.visible)),
  };
}

export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

export function convexHull(points) {
  const unique = [...new Map(points.map((point) => [`${point.x}:${point.y}`, point])).values()];
  if (unique.length <= 2) return unique;

  const sorted = unique.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (origin, a, b) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current];
    const b = polygon[previous];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const amount = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const projection = { x: start.x + amount * dx, y: start.y + amount * dy };
  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

export function distanceToPolygon(point, polygon) {
  if (!polygon || polygon.length < 2) return Number.POSITIVE_INFINITY;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    distance = Math.min(distance, distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]));
  }
  return distance;
}
