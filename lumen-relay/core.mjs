export const SIGNALS = Object.freeze([
  Object.freeze({ id: 'circle', label: 'Puls', glyph: '●', color: '#5de4ff', glow: 'rgba(93, 228, 255, .7)' }),
  Object.freeze({ id: 'triangle', label: 'Vektor', glyph: '▲', color: '#ffd166', glow: 'rgba(255, 209, 102, .7)' }),
  Object.freeze({ id: 'square', label: 'Ramme', glyph: '■', color: '#b69cff', glow: 'rgba(182, 156, 255, .7)' }),
]);

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function circlesOverlap(a, b, padding = 0) {
  return distance(a, b) <= (a.radius ?? 0) + (b.radius ?? 0) + padding;
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0, length: 0 };
  return { x: x / length, y: y / length, length };
}

export function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function difficultyFor(deliveries) {
  const wave = Math.floor(Math.max(0, deliveries) / 5) + 1;
  return {
    wave,
    packetInterval: clamp(2.5 - (wave - 1) * 0.16, 1.15, 2.5),
    packetLifetime: clamp(12 - (wave - 1) * 0.35, 7.5, 12),
    interferenceCount: clamp(1 + Math.floor((wave - 1) * 0.8), 1, 10),
    interferenceSpeed: clamp(72 + (wave - 1) * 9, 72, 170),
    steering: clamp(0.12 + (wave - 1) * 0.012, 0.12, 0.24),
  };
}

export function deliveryScore({ combo = 0, lifetime = 0, maxLifetime = 1 } = {}) {
  const safeLifetime = clamp(lifetime, 0, Math.max(1, maxLifetime));
  const urgency = 1 - safeLifetime / Math.max(1, maxLifetime);
  const speedBonus = Math.round((1 - urgency) * 60);
  const nextCombo = clamp(combo + 1, 1, 8);
  const multiplier = 1 + (nextCombo - 1) * 0.25;
  const points = Math.round((100 + speedBonus) * multiplier);
  return { points, nextCombo, multiplier, speedBonus };
}

export function formatScore(value) {
  return Math.max(0, Math.round(value)).toLocaleString('nb-NO');
}

export function chooseSpawnPoint({ width, height, margin = 80, avoid = [], random = Math.random, attempts = 40 }) {
  const minX = margin;
  const maxX = Math.max(margin, width - margin);
  const minY = margin;
  const maxY = Math.max(margin, height - margin);
  let fallback = { x: width / 2, y: height / 2 };

  for (let index = 0; index < attempts; index += 1) {
    const point = {
      x: minX + random() * Math.max(0, maxX - minX),
      y: minY + random() * Math.max(0, maxY - minY),
    };
    fallback = point;
    const clear = avoid.every((area) => distance(point, area) >= (area.radius ?? 0) + (area.clearance ?? 70));
    if (clear) return point;
  }

  return fallback;
}
