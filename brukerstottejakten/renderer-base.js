import { clamp } from './game-core.js';

const TAU = Math.PI * 2;

const THEMES = [
  { sky: ['#0b3347', '#67b6b4', '#eacb91'], ground: ['#28564b', '#071d26'], accent: '#72f0c9', sun: '#ffd780', city: '#173f45', haze: '#c9ead2' },
  { sky: ['#123b51', '#5fa9af', '#efc582'], ground: ['#2c5c4d', '#081d27'], accent: '#77f4cd', sun: '#ffe08b', city: '#183d45', haze: '#c4e4cb' },
  { sky: ['#163b56', '#4d929f', '#dca96d'], ground: ['#315044', '#091b26'], accent: '#ffd166', sun: '#ffc55f', city: '#203c45', haze: '#b7d2bc' },
  { sky: ['#17364d', '#477c8b', '#bf8564'], ground: ['#34473e', '#0a1924'], accent: '#ff9f68', sun: '#ffbf68', city: '#233740', haze: '#aabca8' },
  { sky: ['#172d48', '#3f6578', '#936b69'], ground: ['#283f3d', '#081722'], accent: '#ff7b69', sun: '#eab66e', city: '#1d303a', haze: '#8da9a1' },
  { sky: ['#10263e', '#31566b', '#725d70'], ground: ['#213638', '#06141e'], accent: '#72d8d0', sun: '#c7b6a2', city: '#172936', haze: '#718d8f' },
  { sky: ['#0a1f35', '#24465f', '#554f6c'], ground: ['#1b3035', '#05121c'], accent: '#5be0c1', sun: '#c8d3cf', city: '#122532', haze: '#607f85' },
  { sky: ['#08192d', '#20394f', '#423f5b'], ground: ['#172a31', '#040f18'], accent: '#ff6f68', sun: '#bbc9ca', city: '#10202d', haze: '#536a78' },
  { sky: ['#071526', '#1c3246', '#323850'], ground: ['#13252d', '#030c14'], accent: '#80b7ff', sun: '#d9e5e4', city: '#0d1b28', haze: '#485e70' },
  { sky: ['#050d1b', '#152538', '#272d47'], ground: ['#101e29', '#02080f'], accent: '#ffd166', sun: '#e9f3ef', city: '#091521', haze: '#3e5063' },
];

const KIND_STYLE = {
  normal: { front: '#dd7043', light: '#ffa36a', dark: '#7b2f2d', stripe: '#ffd56c', glow: '#ffb15d', label: 'BRUKERSTØTTESAK' },
  priority: { front: '#c34850', light: '#ff7d74', dark: '#681f32', stripe: '#ffe08a', glow: '#ff716b', label: 'PRIORITET' },
  legacy: { front: '#2f8580', light: '#68d9c4', dark: '#174c51', stripe: '#f4d879', glow: '#5be0c1', label: 'ELDRE SAK' },
  shield: { front: '#526fa3', light: '#8eb9ff', dark: '#27345e', stripe: '#a7f2df', glow: '#83b9ff', label: 'SKJERMET' },
  critical: { front: '#9d3150', light: '#f06478', dark: '#45182f', stripe: '#ffd768', glow: '#ff536b', label: 'KRITISK' },
  duplicate: { front: '#535d6d', light: '#8894a6', dark: '#242b38', stripe: '#d6d9de', glow: '#b0bac8', label: 'DUPLIKAT' },
  major: { front: '#7a2c28', light: '#d96b45', dark: '#32141d', stripe: '#ffe078', glow: '#ffc34d', label: 'HOVEDHENDELSE' },
  bonus: { front: '#237b67', light: '#63e0b8', dark: '#103d3b', stripe: '#e5ff9a', glow: '#76f3c6', label: 'KUNNSKAPSBASE' },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const expanded = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function polygonContains(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
      && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function seededNoise(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SceneRenderer {
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!this.context) throw new Error('Canvas-motoren kunne ikke startes.');
    this.reducedMotion = reducedMotion;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.aspect = 1;
    this.aimX = 0;
    this.aimY = 0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.shake = 0;
    this.levelPulse = 0;
    this.impactFlash = 0;
    this.slowMode = false;
    this.overload = false;
    this.particles = [];
    this.shockwaves = [];
    this.confetti = [];
    this.clouds = this.createClouds();
    this.stars = this.createStars();
    this.city = this.createCity();
    this.info = { mode: 'canvas-depth', label: 'Hybrid dybdemotor 4.0' };
    this.resize();
  }

  createClouds() {
    const random = seededNoise(4412);
    return Array.from({ length: 9 }, (_, index) => ({
      x: random(),
      y: 0.08 + random() * 0.36,
      scale: 0.45 + random() * 1.1,
      speed: 0.004 + random() * 0.009,
      alpha: 0.14 + random() * 0.26,
      layer: index % 3,
    }));
  }

  createStars() {
    const random = seededNoise(9071);
    return Array.from({ length: 130 }, () => ({
      x: random(),
      y: random() * 0.62,
      size: 0.4 + random() * 1.8,
      twinkle: random() * TAU,
    }));
  }

  createCity() {
    const random = seededNoise(1209);
    return Array.from({ length: 48 }, () => ({
      width: 0.018 + random() * 0.035,
      height: 0.04 + random() * 0.15,
      antenna: random() > 0.82,
      lights: Math.floor(2 + random() * 5),
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.aspect = this.width / this.height;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
  }

  setAim(x, y) {
    this.aimX = clamp((x / Math.max(this.width, 1) - 0.5) * 2, -1, 1);
    this.aimY = clamp((y / Math.max(this.height, 1) - 0.5) * 2, -1, 1);
  }

  setSlowMode(active) {
    this.slowMode = Boolean(active);
  }

  setOverload(active) {
    this.overload = Boolean(active);
  }

  pulseLevel() {
    this.levelPulse = 1;
  }

  pulseImpact(target, { color, strength = 1 } = {}) {
    const center = target?.screen?.center ?? { x: this.width / 2, y: this.height / 2 };
    const style = KIND_STYLE[target?.kind] || KIND_STYLE.normal;
    const effectColor = color || style.glow;
    this.impactFlash = Math.max(this.impactFlash, 0.25 * strength);
    this.shake = Math.max(this.shake, 5.5 * strength);
    this.shockwaves.push({ x: center.x, y: center.y, radius: 8, life: 0.48, maxLife: 0.48, color: effectColor });
    const count = this.reducedMotion ? 7 : Math.round(16 * strength);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * TAU;
      const speed = 70 + Math.random() * 250 * strength;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        gravity: 260 + Math.random() * 190,
        life: 0.45 + Math.random() * 0.42,
        maxLife: 0.87,
        size: 3 + Math.random() * 8,
        rotation: Math.random() * TAU,
        spin: -7 + Math.random() * 14,
        color: Math.random() > 0.35 ? style.front : style.light,
      });
    }
  }

  pulseMiss(x, y) {
    this.shake = Math.max(this.shake, 2.5);
    this.shockwaves.push({ x, y, radius: 5, life: 0.28, maxLife: 0.28, color: '#ff726d' });
  }

  spawnConfetti() {
    const colors = ['#ffd66b', '#71f1ca', '#ff765e', '#f8f2da', '#8db7ff', '#f28bb4'];
    const count = this.reducedMotion ? 36 : 120;
    this.confetti = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * this.width,
      y: -20 - Math.random() * this.height * 0.8,
      vx: -35 + Math.random() * 70,
      vy: 70 + Math.random() * 150,
      rotation: Math.random() * TAU,
      spin: -6 + Math.random() * 12,
      width: 4 + Math.random() * 9,
      height: 8 + Math.random() * 15,
      color: colors[index % colors.length],
    }));
  }

  clearEffects() {
    this.particles.length = 0;
    this.shockwaves.length = 0;
    this.confetti.length = 0;
    this.shake = 0;
    this.impactFlash = 0;
  }

  project(x, y, z) {
    const depth = Math.max(2.8, 9.5 - z);
    const focal = Math.min(this.width, this.height) * 1.26;
    const parallaxX = this.cameraX * depth * 0.018;
    const parallaxY = this.cameraY * depth * 0.012;
    return {
      x: this.width * 0.5 + (x - parallaxX) * focal / depth,
      y: this.height * 0.48 - (y - parallaxY) * focal / depth,
      scale: focal / depth,
      depth,
    };
  }

  hitTest(targets, x, y, scale = 1) {
    const ordered = [...targets]
      .filter((target) => !target.dead && !target.resolving && target.screen)
      .sort((a, b) => (b.screen?.scale || 0) - (a.screen?.scale || 0));
    for (const target of ordered) {
      const screen = target.screen;
      const expand = Math.max(8, Math.min(screen.width, screen.height) * 0.16) * scale;
      const bounds = {
        left: screen.bounds.left - expand,
        right: screen.bounds.right + expand,
        top: screen.bounds.top - expand,
        bottom: screen.bounds.bottom + expand,
      };
      if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
      if (polygonContains({ x, y }, screen.polygon)) return target;
      if (scale > 1 && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) return target;
    }
    return null;
  }

  updateEffects(delta) {
    this.cameraX += (this.aimX * 0.65 - this.cameraX) * Math.min(1, delta * 4.2);
    this.cameraY += (this.aimY * 0.34 - this.cameraY) * Math.min(1, delta * 4.2);
    this.levelPulse = Math.max(0, this.levelPulse - delta * 0.75);
    this.impactFlash = Math.max(0, this.impactFlash - delta * 2.8);
    this.shake = Math.max(0, this.shake - delta * 26);

    for (const particle of this.particles) {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += particle.gravity * delta;
      particle.rotation += particle.spin * delta;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);

    for (const wave of this.shockwaves) {
      wave.life -= delta;
      wave.radius += 210 * delta;
    }
    this.shockwaves = this.shockwaves.filter((wave) => wave.life > 0);

    for (const piece of this.confetti) {
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.vy += 85 * delta;
      piece.rotation += piece.spin * delta;
    }
    this.confetti = this.confetti.filter((piece) => piece.y < this.height + 60);
  }

  drawSky(theme, time, level) {
    const context = this.context;
    const sky = context.createLinearGradient(0, 0, 0, this.height * 0.69);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.54, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    context.fillStyle = sky;
    context.fillRect(0, 0, this.width, this.height);

    const night = clamp((level - 5) / 5, 0, 1);
    if (night > 0.08) {
      context.save();
      for (const star of this.stars) {
        const twinkle = 0.3 + Math.sin(time * 1.8 + star.twinkle) * 0.25;
        context.globalAlpha = night * clamp(twinkle, 0.08, 0.62);
        context.fillStyle = '#e9fff8';
        context.beginPath();
        context.arc(star.x * this.width - this.cameraX * 11, star.y * this.height - this.cameraY * 4, star.size, 0, TAU);
        context.fill();
      }
      context.restore();
    }

    const sunX = this.width * (level >= 7 ? 0.76 : 0.79) - this.cameraX * 22;
    const sunY = this.height * (level >= 7 ? 0.17 : 0.15) - this.cameraY * 10;
    const sunRadius = clamp(this.width * 0.025, 22, 42);
    const glow = context.createRadialGradient(sunX, sunY, 2, sunX, sunY, sunRadius * 3.6);
    glow.addColorStop(0, rgba(theme.sun, 0.95));
    glow.addColorStop(0.3, rgba(theme.sun, 0.42));
    glow.addColorStop(1, rgba(theme.sun, 0));
    context.fillStyle = glow;
    context.fillRect(sunX - sunRadius * 4, sunY - sunRadius * 4, sunRadius * 8, sunRadius * 8);
    context.fillStyle = theme.sun;
    context.beginPath();
    context.arc(sunX, sunY, sunRadius, 0, TAU);
    context.fill();

    if (level >= 9) this.drawAurora(time, theme.accent);
    this.drawClouds(time, level);
  }

  drawAurora(time, accent) {
    const context = this.context;
    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineCap = 'round';
    for (let layer = 0; layer < 3; layer += 1) {
      context.beginPath();
      const yBase = this.height * (0.14 + layer * 0.07);
      for (let x = -40; x <= this.width + 40; x += 18) {
        const y = yBase + Math.sin(x * 0.009 + time * (0.35 + layer * 0.08) + layer) * (18 + layer * 10)
          + Math.sin(x * 0.021 - time * 0.2) * 9;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = rgba(layer === 1 ? '#8da9ff' : accent, 0.08 + layer * 0.025);
      context.lineWidth = 28 + layer * 12;
      context.shadowColor = accent;
      context.shadowBlur = 20;
      context.stroke();
    }
    context.restore();
  }

  drawClouds(time, level) {
    const context = this.context;
    const night = clamp((level - 6) / 4, 0, 0.7);
    for (const cloud of this.clouds) {
      const x = ((cloud.x + time * cloud.speed * (cloud.layer + 1)) % 1.25 - 0.12) * this.width - this.cameraX * (6 + cloud.layer * 8);
      const y = cloud.y * this.height - this.cameraY * (2 + cloud.layer * 3);
      const scale = cloud.scale * clamp(this.width / 1300, 0.72, 1.2);
      context.save();
      context.globalAlpha = cloud.alpha * (1 - night * 0.45);
      context.fillStyle = level >= 7 ? '#9eb5bb' : '#e6f4df';
      context.shadowColor = 'rgba(255,255,255,.12)';
      context.shadowBlur = 20 * scale;
      roundedRect(context, x, y, 112 * scale, 27 * scale, 15 * scale);
      context.fill();
      context.beginPath();
      context.arc(x + 29 * scale, y + 2 * scale, 25 * scale, 0, TAU);
      context.arc(x + 66 * scale, y - 5 * scale, 34 * scale, 0, TAU);
      context.arc(x + 95 * scale, y + 4 * scale, 22 * scale, 0, TAU);
      context.fill();
      context.restore();
    }
  }

  drawMountains(theme, time) {
    const context = this.context;
    const horizon = this.height * 0.63;
    const layers = [
      { y: horizon + 12, amp: this.height * 0.13, color: rgba(theme.haze, 0.52), speed: 5, step: this.width * 0.16 },
      { y: horizon + 26, amp: this.height * 0.095, color: rgba(theme.city, 0.84), speed: 9, step: this.width * 0.12 },
    ];
    for (const layer of layers) {
      const offset = time * layer.speed + this.cameraX * 35;
      context.fillStyle = layer.color;
      context.beginPath();
      context.moveTo(0, this.height);
      context.lineTo(0, layer.y);
      for (let x = -layer.step; x <= this.width + layer.step; x += layer.step) {
        const peak = layer.y - layer.amp - Math.sin((x + offset) * 0.006) * layer.amp * 0.2;
        context.lineTo(x, peak);
        context.lineTo(x + layer.step * 0.54, layer.y + Math.cos((x + offset) * 0.008) * layer.amp * 0.09);
      }
      context.lineTo(this.width, this.height);
      context.closePath();
      context.fill();
    }
  }

  drawCity(theme, time, level) {
    const context = this.context;
    const baseline = this.height * 0.64;
    const scale = clamp(this.width / 1250, 0.72, 1.15);
    let x = -((time * (1.6 + level * 0.05) + this.cameraX * 24) % 70) - 12;
    for (let index = 0; x < this.width + 80; index += 1) {
      const building = this.city[index % this.city.length];
      const width = building.width * this.width * scale;
      const height = building.height * this.height * scale;
      context.fillStyle = theme.city;
      context.fillRect(x, baseline - height, width, height);
      if (building.antenna) {
        context.fillRect(x + width * 0.48, baseline - height - 18 * scale, 2, 18 * scale);
        context.fillStyle = theme.accent;
        context.fillRect(x + width * 0.48 - 1, baseline - height - 21 * scale, 4, 4);
      }
      context.fillStyle = rgba(level >= 7 ? '#8bd6ce' : '#f4e8b3', level >= 7 ? 0.25 : 0.18);
      for (let row = 0; row < building.lights; row += 1) {
        const wy = baseline - height + 9 + row * 12 * scale;
        if (wy > baseline - 6) break;
        context.fillRect(x + 6, wy, 4, 3);
        if (width > 24) context.fillRect(x + width - 10, wy, 4, 3);
      }
      x += width + 8 * scale;
    }
  }

  drawGround(theme, time, level) {
    const context = this.context;
    const horizon = this.height * 0.63;
    const ground = context.createLinearGradient(0, horizon, 0, this.height);
    ground.addColorStop(0, theme.ground[0]);
    ground.addColorStop(1, theme.ground[1]);
    context.fillStyle = ground;
    context.fillRect(0, horizon, this.width, this.height - horizon);

    const vanishingX = this.width * 0.5 - this.cameraX * 28;
    context.save();
    context.strokeStyle = rgba(theme.accent, this.slowMode ? 0.35 : 0.19);
    context.lineWidth = 1;
    for (let index = -14; index <= 14; index += 1) {
      context.beginPath();
      context.moveTo(vanishingX + index * 4.5, horizon);
      context.lineTo(vanishingX + index * this.width * 0.1, this.height);
      context.stroke();
    }
    for (let row = 0; row < 15; row += 1) {
      const p = ((row + (time * (0.5 + level * 0.04)) % 1) / 14);
      const y = horizon + (this.height - horizon) * p * p;
      context.globalAlpha = 0.09 + p * 0.27;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.width, y);
      context.stroke();
    }
    context.restore();

    context.fillStyle = rgba('#061b20', 0.9);
    for (let x = -26; x < this.width + 40; x += 36) {
      const sway = Math.sin(time * 1.4 + x * 0.05) * 3;
      context.beginPath();
      context.arc(x + sway, this.height + 4, 30 + (Math.abs(x) % 5), Math.PI, TAU);
      context.fill();
    }
  }

  drawWeather(time, level, theme) {
    const context = this.context;
    if (level >= 7 && level <= 9) {
      context.save();
      context.strokeStyle = rgba('#b8e5e4', 0.17 + (level - 7) * 0.035);
      context.lineWidth = 1;
      const count = this.reducedMotion ? 34 : 95;
      for (let index = 0; index < count; index += 1) {
        const x = ((index * 73 + time * 290) % (this.width + 120)) - 60;
        const y = ((index * 47 + time * 610) % (this.height + 80)) - 40;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 9, y + 24);
        context.stroke();
      }
      context.restore();
    }

    if (this.overload) {
      context.save();
      context.fillStyle = rgba('#ff536b', 0.045 + Math.sin(time * 8) * 0.015);
      context.fillRect(0, 0, this.width, this.height);
      context.strokeStyle = rgba('#ff6f68', 0.17);
      context.lineWidth = 2;
      context.strokeRect(5, 5, this.width - 10, this.height - 10);
      context.restore();
    }

    if (this.slowMode) {
      context.save();
      context.globalCompositeOperation = 'screen';
      const field = context.createRadialGradient(this.width / 2, this.height * 0.48, 20, this.width / 2, this.height * 0.48, Math.max(this.width, this.height) * 0.65);
      field.addColorStop(0, rgba(theme.accent, 0.04));
      field.addColorStop(0.75, rgba(theme.accent, 0.08));
      field.addColorStop(1, rgba(theme.accent, 0));
      context.fillStyle = field;
      context.fillRect(0, 0, this.width, this.height);
      context.restore();
    }
  }

  drawTrail(target, screen, style) {
    if (target.kind === 'duplicate' || target.resolving) return;
    const context = this.context;
    const direction = target.direction || 1;
    const length = clamp(screen.width * (target.kind === 'critical' ? 0.9 : 0.55), 22, 112);
    const tailX = direction > 0 ? screen.bounds.left : screen.bounds.right;
    const gradient = context.createLinearGradient(tailX, 0, tailX - direction * length, 0);
    gradient.addColorStop(0, rgba(style.glow, 0.46));
    gradient.addColorStop(1, rgba(style.glow, 0));
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(tailX, screen.center.y - screen.height * 0.24);
    context.lineTo(tailX - direction * length, screen.center.y - screen.height * 0.06);
    context.lineTo(tailX - direction * length, screen.center.y + screen.height * 0.16);
    context.lineTo(tailX, screen.center.y + screen.height * 0.28);
    context.closePath();
    context.fill();
  }

  computeTargetScreen(target) {
    const projection = this.project(target.x, target.y, target.z);
    const width = Math.max(36, target.width * projection.scale);
    const height = Math.max(20, target.height * projection.scale);
    const depth = Math.max(7, target.depth * projection.scale);
    const bank = target.bank || 0;
    const tiltX = Math.sin(bank) * height * 0.24;
    const tiltY = Math.cos(bank) * width * 0.035;
    const front = [
      { x: projection.x - width / 2, y: projection.y - height / 2 - tiltX },
      { x: projection.x + width / 2, y: projection.y - height / 2 + tiltX },
      { x: projection.x + width / 2, y: projection.y + height / 2 + tiltX },
      { x: projection.x - width / 2, y: projection.y + height / 2 - tiltX },
    ];
    const offset = { x: depth * (0.55 + target.yaw * 0.25), y: -depth * (0.45 - tiltY / Math.max(width, 1)) };
    const all = [...front, ...front.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }))];
    const xs = all.map((point) => point.x);
    const ys = all.map((point) => point.y);
    return {
      center: { x: projection.x + offset.x * 0.2, y: projection.y + offset.y * 0.2 },
      width,
      height,
      depth,
      scale: projection.scale,
      front,
      offset,
      polygon: front,
      bounds: { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) },
    };
  }

  drawTarget(target, time) {
    const context = this.context;
    const style = target.lucky ? KIND_STYLE.bonus : KIND_STYLE[target.kind] || KIND_STYLE.normal;
    const screen = this.computeTargetScreen(target);
    target.screen = screen;
    const { front, offset, width, height } = screen;
    const alpha = clamp(target.alpha ?? 1, 0, 1);
    const flash = clamp(target.flash || 0, 0, 1);

    this.drawTrail(target, screen, style);

    context.save();
    context.globalAlpha = alpha;
    const shadowY = clamp(screen.bounds.bottom + height * 0.42 + (-target.y * screen.scale * 0.04), screen.bounds.bottom + 10, this.height - 26);
    context.fillStyle = 'rgba(0, 8, 14, .26)';
    context.filter = `blur(${clamp(8 + screen.scale * 0.025, 8, 19)}px)`;
    context.beginPath();
    context.ellipse(screen.center.x + offset.x * 0.4, shadowY, width * 0.48, height * 0.18, 0, 0, TAU);
    context.fill();
    context.filter = 'none';

    const back = front.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));

    context.fillStyle = style.light;
    context.beginPath();
    context.moveTo(front[0].x, front[0].y);
    context.lineTo(front[1].x, front[1].y);
    context.lineTo(back[1].x, back[1].y);
    context.lineTo(back[0].x, back[0].y);
    context.closePath();
    context.fill();

    context.fillStyle = style.dark;
    context.beginPath();
    context.moveTo(front[1].x, front[1].y);
    context.lineTo(front[2].x, front[2].y);
    context.lineTo(back[2].x, back[2].y);
    context.lineTo(back[1].x, back[1].y);
    context.closePath();
    context.fill();

    const faceGradient = context.createLinearGradient(screen.bounds.left, screen.bounds.top, screen.bounds.right, screen.bounds.bottom);
    faceGradient.addColorStop(0, style.light);
    faceGradient.addColorStop(0.18, style.front);
    faceGradient.addColorStop(0.78, style.front);
    faceGradient.addColorStop(1, style.dark);
    context.fillStyle = faceGradient;
    context.beginPath();
    context.moveTo(front[0].x, front[0].y);
    context.lineTo(front[1].x, front[1].y);
    context.lineTo(front[2].x, front[2].y);
    context.lineTo(front[3].x, front[3].y);
    context.closePath();
    context.shadowColor = rgba(style.glow, target.kind === 'major' ? 0.65 : 0.28);
    context.shadowBlur = target.kind === 'major' ? 28 : 12;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = rgba(style.light, 0.85);
    context.lineWidth = clamp(screen.scale * 0.009, 1, 2.5);
    context.stroke();

    const stripeY = lerp(front[0].y, front[3].y, 0.22);
    const stripeY2 = lerp(front[1].y, front[2].y, 0.22);
    const stripeBottomY = lerp(front[0].y, front[3].y, 0.35);
    const stripeBottomY2 = lerp(front[1].y, front[2].y, 0.35);
    context.fillStyle = style.stripe;
    context.beginPath();
    context.moveTo(front[0].x, stripeY);
    context.lineTo(front[1].x, stripeY2);
    context.lineTo(front[1].x, stripeBottomY2);
    context.lineTo(front[0].x, stripeBottomY);
    context.closePath();
    context.fill();

    const fontSize = clamp(width * 0.075, 7.5, target.kind === 'major' ? 18 : 14);
    context.save();
    context.translate(screen.center.x, screen.center.y);
    context.rotate(target.bank || 0);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#effff8';
    context.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    context.shadowColor = 'rgba(0,0,0,.72)';
    context.shadowBlur = 4;
    const mainLabel = target.lucky ? '★ LYKKESAK ★' : target.kind === 'major' ? 'HOVEDHENDELSE' : target.kind === 'duplicate' ? 'DUPLIKAT' : 'Brukerstøttesak';
    context.fillText(mainLabel, 0, height * 0.06, width * 0.78);
    context.fillStyle = target.kind === 'duplicate' ? '#f1f4f6' : style.stripe;
    context.font = `800 ${clamp(fontSize * 0.48, 5.5, 8.5)}px ui-monospace, monospace`;
    const detail = target.kind === 'shield' && target.health > 1
      ? `SKJERMING ${target.health}/${target.maxHealth}`
      : target.kind === 'major'
        ? `P1 // FASE ${Math.max(1, target.maxHealth - target.health + 1)}`
        : `${(KIND_STYLE[target.kind] || KIND_STYLE.normal).label} // SM-${String(target.ticket).padStart(4, '0')}`;
    context.fillText(detail, 0, height * 0.28, width * 0.8);
    context.restore();

    if (target.kind === 'duplicate') {
      context.save();
      context.strokeStyle = 'rgba(244,248,252,.78)';
      context.lineWidth = clamp(width * 0.018, 1.5, 4);
      context.setLineDash([8, 5]);
      context.beginPath();
      context.moveTo(front[0].x + width * 0.08, front[0].y + height * 0.18);
      context.lineTo(front[2].x - width * 0.08, front[2].y - height * 0.18);
      context.moveTo(front[1].x - width * 0.08, front[1].y + height * 0.18);
      context.lineTo(front[3].x + width * 0.08, front[3].y - height * 0.18);
      context.stroke();
      context.restore();
    }

    if (target.maxHealth > 1) {
      const barWidth = width * 0.72;
      const barX = screen.center.x - barWidth / 2;
      const barY = screen.bounds.top - 13;
      context.fillStyle = 'rgba(2,14,20,.72)';
      roundedRect(context, barX, barY, barWidth, 6, 3);
      context.fill();
      const ratio = clamp(target.health / target.maxHealth, 0, 1);
      context.fillStyle = style.glow;
      roundedRect(context, barX + 1, barY + 1, Math.max(0, (barWidth - 2) * ratio), 4, 2);
      context.fill();
    }

    if (target.kind === 'shield' && target.health > 1) {
      context.strokeStyle = rgba('#9ac8ff', 0.35 + Math.sin(time * 4 + target.phase) * 0.12);
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(screen.center.x, screen.center.y, width * 0.64, height * 0.72, target.bank || 0, 0, TAU);
      context.stroke();
    }

    if (target.kind === 'major') {
      context.save();
      context.strokeStyle = rgba(style.glow, 0.38 + Math.sin(time * 3.4) * 0.12);
      context.lineWidth = 2.5;
      context.setLineDash([14, 8]);
      context.beginPath();
      context.ellipse(screen.center.x, screen.center.y, width * 0.68, height * 0.84, 0, 0, TAU);
      context.stroke();
      context.restore();
    }

    if (flash > 0) {
      context.globalCompositeOperation = 'screen';
      context.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
      context.beginPath();
      context.moveTo(front[0].x, front[0].y);
      context.lineTo(front[1].x, front[1].y);
      context.lineTo(front[2].x, front[2].y);
      context.lineTo(front[3].x, front[3].y);
      context.closePath();
      context.fill();
    }

    context.restore();
  }

  drawEffects() {
    const context = this.context;
    for (const wave of this.shockwaves) {
      context.save();
      context.globalAlpha = clamp(wave.life / wave.maxLife, 0, 1);
      context.strokeStyle = wave.color;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(wave.x, wave.y, wave.radius, 0, TAU);
      context.stroke();
      context.restore();
    }

    for (const particle of this.particles) {
      context.save();
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 7;
      context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
      context.restore();
    }

    for (const piece of this.confetti) {
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
      context.restore();
    }
  }

  drawPost(theme) {
    const context = this.context;
    if (this.levelPulse > 0) {
      context.fillStyle = rgba(theme.accent, this.levelPulse * 0.08);
      context.fillRect(0, 0, this.width, this.height);
    }
    if (this.impactFlash > 0) {
      context.fillStyle = `rgba(255,255,255,${this.impactFlash})`;
      context.fillRect(0, 0, this.width, this.height);
    }

    const vignette = context.createRadialGradient(this.width / 2, this.height * 0.46, Math.min(this.width, this.height) * 0.2, this.width / 2, this.height * 0.5, Math.max(this.width, this.height) * 0.73);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.68, 'rgba(0,5,10,.06)');
    vignette.addColorStop(1, 'rgba(0,5,10,.58)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, this.width, this.height);

    context.save();
    context.globalAlpha = 0.08;
    context.fillStyle = '#031016';
    for (let y = 0; y < this.height; y += 4) context.fillRect(0, y, this.width, 1);
    context.restore();
  }

  render({ time = 0, delta = 0, level = 1, targets = [], overload = false } = {}) {
    this.updateEffects(delta);
    this.setOverload(overload);
    const theme = THEMES[clamp(level - 1, 0, THEMES.length - 1)];
    const shakeX = this.reducedMotion ? 0 : (Math.random() - 0.5) * this.shake;
    const shakeY = this.reducedMotion ? 0 : (Math.random() - 0.5) * this.shake * 0.65;
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, shakeX * this.dpr, shakeY * this.dpr);
    context.clearRect(-20, -20, this.width + 40, this.height + 40);

    this.drawSky(theme, time, level);
    this.drawMountains(theme, time);
    this.drawCity(theme, time, level);
    this.drawGround(theme, time, level);
    this.drawWeather(time, level, theme);

    const ordered = [...targets].filter((target) => !target.dead).sort((a, b) => a.z - b.z);
    for (const target of ordered) this.drawTarget(target, time);
    this.drawEffects();
    this.drawPost(theme);

    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
}
