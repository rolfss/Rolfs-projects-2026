import {
  clamp,
  composeTransform,
  damp,
  hexToRgb,
  lerp,
  mat4Identity,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
  mat4TransformPointRaw,
  normalMatrixFromMat4,
  projectPoint,
} from './math3d.js';

const DEG = Math.PI / 180;
const TARGET_COLORS = {
  normal: { body: '#d75f32', edge: '#ffbd70', light: '#fff0c3', glow: '#ffd85a' },
  priority: { body: '#b93346', edge: '#ff8a85', light: '#ffe0d5', glow: '#ff6f68' },
  legacy: { body: '#257d76', edge: '#6be0c6', light: '#d6fff1', glow: '#5be0c1' },
  major: { body: '#8d3b24', edge: '#ffd978', light: '#fff2bd', glow: '#ffbd4f' },
};

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function mixColor(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function makeRoundedPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
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

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shaderfeil: ${log}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Programfeil: ${log}`);
  }
  return program;
}

function createMesh(gl, { positions, normals, uvs, indices, mode = gl.TRIANGLES }) {
  const mesh = {
    position: gl.createBuffer(),
    normal: gl.createBuffer(),
    uv: gl.createBuffer(),
    index: gl.createBuffer(),
    count: indices.length,
    mode,
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return mesh;
}

function createLineMesh(gl, positions) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  return { buffer, count: positions.length / 3 };
}

function cubeGeometry() {
  const faces = [
    { n: [0, 0, 1], p: [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]] },
    { n: [0, 0, -1], p: [[.5, -.5, -.5], [-.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5]] },
    { n: [0, 1, 0], p: [[-.5, .5, .5], [.5, .5, .5], [.5, .5, -.5], [-.5, .5, -.5]] },
    { n: [0, -1, 0], p: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]] },
    { n: [1, 0, 0], p: [[.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5]] },
    { n: [-1, 0, 0], p: [[-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5]] },
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  faces.forEach((face, faceIndex) => {
    const start = faceIndex * 4;
    face.p.forEach((point) => {
      positions.push(...point);
      normals.push(...face.n);
    });
    uvs.push(0, 1, 1, 1, 1, 0, 0, 0);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  });
  return { positions, normals, uvs, indices };
}

function quadGeometry() {
  return {
    positions: [-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    indices: [0, 1, 2, 0, 2, 3],
  };
}

function pyramidGeometry() {
  const positions = [
    -.5, -.5, .5, .5, -.5, .5, .5, -.5, -.5, -.5, -.5, -.5,
    -.5, -.5, .5, .5, -.5, .5, 0, .5, 0,
    .5, -.5, .5, .5, -.5, -.5, 0, .5, 0,
    .5, -.5, -.5, -.5, -.5, -.5, 0, .5, 0,
    -.5, -.5, -.5, -.5, -.5, .5, 0, .5, 0,
  ];
  const normals = [
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, .45, .9, 0, .45, .9, 0, .45, .9,
    .9, .45, 0, .9, .45, 0, .9, .45, 0,
    0, .45, -.9, 0, .45, -.9, 0, .45, -.9,
    -.9, .45, 0, -.9, .45, 0, -.9, .45, 0,
  ];
  const uvs = new Array((positions.length / 3) * 2).fill(0);
  const indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  return { positions, normals, uvs, indices };
}

function createTicketCanvas(kind) {
  const palette = TARGET_COLORS[kind] || TARGET_COLORS.normal;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, palette.edge);
  gradient.addColorStop(.12, palette.body);
  gradient.addColorStop(.78, palette.body);
  gradient.addColorStop(1, '#351d1b');
  context.fillStyle = gradient;
  makeRoundedPath(context, 6, 6, 1012, 500, 48);
  context.fill();
  context.strokeStyle = palette.light;
  context.lineWidth = 10;
  context.stroke();

  context.fillStyle = palette.glow;
  context.fillRect(8, 84, 1008, 70);
  context.fillStyle = 'rgba(5, 24, 28, .92)';
  makeRoundedPath(context, 56, 190, 912, 220, 34);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,.18)';
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = 'rgba(9, 30, 32, .88)';
  context.font = '900 34px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillText('SERVICE MANAGER', 66, 120);
  const statusLabel = kind === 'major' ? 'HOVEDHENDELSE' : kind === 'priority' ? 'KRITISK' : kind === 'legacy' ? 'ELDRE SAK' : 'ÅPEN';
  const detailLabel = kind === 'major' ? 'P1 // SISTE SAK' : kind === 'priority' ? 'SLA: HASTER' : kind === 'legacy' ? 'MIGRERING KREVES' : 'KLAR FOR BEHANDLING';
  context.textAlign = 'right';
  context.fillText(statusLabel, 950, 120);

  context.fillStyle = palette.light;
  context.textAlign = 'center';
  context.font = `950 ${kind === 'major' ? 66 : 76}px system-ui, -apple-system, sans-serif`;
  context.fillText(kind === 'major' ? 'Hovedhendelse' : 'Brukerstøttesak', 512, 285);
  context.fillStyle = palette.glow;
  context.font = '800 31px ui-monospace, SFMono-Regular, Consolas, monospace';
  context.fillText(detailLabel, 512, 355);

  context.fillStyle = 'rgba(255,255,255,.52)';
  for (let index = 0; index < 21; index += 1) {
    const barWidth = index % 3 === 0 ? 8 : 4;
    context.fillRect(72 + index * 18, 446, barWidth, 34);
  }
  context.fillStyle = 'rgba(5,24,28,.65)';
  context.textAlign = 'right';
  context.font = '800 25px ui-monospace, monospace';
  context.fillText('NOARK-KLAR FLYT', 952, 466);
  return canvas;
}

function createScreenCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#071b22');
  gradient.addColorStop(1, '#0c3a3f');
  context.fillStyle = gradient;
  makeRoundedPath(context, 3, 3, 506, 250, 25);
  context.fill();
  context.strokeStyle = '#89ffe1';
  context.lineWidth = 7;
  context.stroke();
  context.fillStyle = '#b7ffe9';
  context.shadowColor = '#5be0c1';
  context.shadowBlur = 25;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '950 61px ui-monospace, Consolas, monospace';
  context.fillText('SERVICE', 256, 91);
  context.font = '950 53px ui-monospace, Consolas, monospace';
  context.fillText('MANAGER', 256, 164);
  context.shadowBlur = 0;
  context.fillStyle = '#ffd85a';
  context.font = '800 20px ui-monospace, monospace';
  context.fillText('ONLINE • SLA MODE', 256, 221);
  context.fillStyle = 'rgba(255,255,255,.07)';
  for (let y = 10; y < 246; y += 7) context.fillRect(10, y, 492, 2);
  return canvas;
}

function createFacadeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  const columns = 4;
  const rows = 9;
  const marginX = 24;
  const marginY = 26;
  const gapX = 14;
  const gapY = 18;
  const windowWidth = (canvas.width - marginX * 2 - gapX * (columns - 1)) / columns;
  const windowHeight = (canvas.height - marginY * 2 - gapY * (rows - 1)) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const active = ((row * 7 + column * 11) % 9) !== 0;
      if (!active) continue;
      const x = marginX + column * (windowWidth + gapX);
      const y = marginY + row * (windowHeight + gapY);
      const glow = context.createLinearGradient(x, y, x, y + windowHeight);
      glow.addColorStop(0, 'rgba(255,255,255,.95)');
      glow.addColorStop(.35, 'rgba(221,255,244,.78)');
      glow.addColorStop(1, 'rgba(128,205,193,.52)');
      context.fillStyle = glow;
      makeRoundedPath(context, x, y, windowWidth, windowHeight, 3);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,.28)';
      context.fillRect(x + 3, y + 3, windowWidth - 6, 2);
    }
  }
  return canvas;
}

function createRadialCanvas(inner, outer = 'rgba(0,0,0,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(.35, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return canvas;
}

function createTexture(gl, source, { linear = true, clampEdges = true } = {}) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clampEdges ? gl.CLAMP_TO_EDGE : gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clampEdges ? gl.CLAMP_TO_EDGE : gl.REPEAT);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

const SKY_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SKY_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uProgress;
uniform vec2 uAim;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float cloudField(vec2 p, float time) {
  float broad = sin(p.x * 5.7 + time * 0.23 + sin(p.y * 3.2) * 1.4);
  float detail = sin(p.x * 11.3 - time * 0.17 + p.y * 7.6);
  float wisps = sin((p.x + p.y) * 18.0 + time * 0.11);
  return 0.5 + broad * 0.25 + detail * 0.16 + wisps * 0.09;
}
void main() {
  vec2 uv = vUv;
  float dusk = smoothstep(0.38, 1.0, uProgress);
  vec3 topMorning = vec3(0.035, 0.18, 0.28);
  vec3 horizonMorning = vec3(0.42, 0.73, 0.73);
  vec3 topDusk = vec3(0.025, 0.055, 0.14);
  vec3 horizonDusk = vec3(0.72, 0.34, 0.23);
  vec3 top = mix(topMorning, topDusk, dusk);
  vec3 horizon = mix(horizonMorning, horizonDusk, dusk);
  float vertical = smoothstep(0.05, 0.88, uv.y);
  vec3 color = mix(horizon, top, vertical);

  vec2 sunPosition = mix(vec2(0.77, 0.73), vec2(0.66, 0.48), dusk) + uAim * vec2(0.012, 0.007);
  float sunDistance = length(uv - sunPosition);
  float sun = 1.0 - smoothstep(0.018, 0.058, sunDistance);
  float halo = 1.0 - smoothstep(0.04, 0.22, sunDistance);
  color += vec3(1.0, 0.72, 0.34) * halo * (0.22 + dusk * 0.22);
  color = mix(color, vec3(1.0, 0.92, 0.62), sun);

  vec2 cloudUv = vec2(uv.x * 2.25, uv.y * 3.8);
  float cloudNoise = cloudField(cloudUv, uTime);
  float cloudBand = smoothstep(0.16, 0.5, uv.y) * (1.0 - smoothstep(0.66, 0.9, uv.y));
  float clouds = smoothstep(0.67, 0.86, cloudNoise) * cloudBand;
  color = mix(color, mix(vec3(0.72, 0.89, 0.87), vec3(0.56, 0.42, 0.45), dusk), clouds * 0.34);

  float stars = step(0.9965, hash(floor(uv * vec2(330.0, 180.0)))) * smoothstep(0.56, 1.0, dusk) * smoothstep(0.48, 0.9, uv.y);
  color += vec3(stars) * 0.85;

  float vignette = smoothstep(0.83, 0.28, distance(uv, vec2(0.5, 0.52)));
  color *= 0.8 + vignette * 0.25;
  gl_FragColor = vec4(color, 1.0);
}`;

const MESH_VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  vUv = aUv;
  gl_Position = uViewProjection * world;
}`;

const MESH_FRAGMENT = `
precision mediump float;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec3 uBaseColor;
uniform vec3 uCameraPosition;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform sampler2D uTexture;
uniform float uUseTexture;
uniform float uAlpha;
uniform float uEmissive;
uniform float uFogStrength;
void main() {
  vec4 texel = texture2D(uTexture, vUv);
  vec3 base = uBaseColor;
  float alpha = uAlpha;
  if (uUseTexture > 0.5) {
    base *= texel.rgb;
    alpha *= texel.a;
  }
  if (alpha < 0.01) discard;
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(-uSunDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float specular = pow(max(dot(normal, halfDirection), 0.0), 28.0);
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4);
  vec3 lit = base * (0.32 + diffuse * 0.78) * uSunColor;
  lit += vec3(specular * 0.32 + rim * 0.12);
  lit = mix(lit, base, clamp(uEmissive, 0.0, 1.0));
  float distanceToCamera = length(vWorldPosition - uCameraPosition);
  float fog = smoothstep(13.0, 47.0, distanceToCamera) * uFogStrength;
  vec3 color = mix(lit, uFogColor, fog);
  gl_FragColor = vec4(color, alpha);
}`;

const LINE_VERTEX = `
attribute vec3 aPosition;
uniform mat4 uViewProjection;
void main() { gl_Position = uViewProjection * vec4(aPosition, 1.0); }
`;

const LINE_FRAGMENT = `
precision mediump float;
uniform vec4 uColor;
void main() { gl_FragColor = uColor; }
`;

const PARTICLE_VERTEX = `
attribute vec3 aPosition;
attribute vec4 aColor;
attribute float aSize;
uniform mat4 uViewProjection;
uniform float uPixelRatio;
varying vec4 vColor;
void main() {
  vec4 clip = uViewProjection * vec4(aPosition, 1.0);
  gl_Position = clip;
  gl_PointSize = clamp(aSize * uPixelRatio * (25.0 / max(1.0, clip.w)), 1.0, 28.0);
  vColor = aColor;
}`;

const PARTICLE_FRAGMENT = `
precision mediump float;
varying vec4 vColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float distanceFromCenter = length(p);
  float alpha = smoothstep(0.5, 0.05, distanceFromCenter) * vColor.a;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, alpha);
}`;

export class SceneRenderer {
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.aspect = 1;
    this.progress = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.cameraAimX = 0;
    this.cameraAimY = 0;
    this.recoil = 0;
    this.shake = 0;
    this.muzzle = 0;
    this.levelFlash = 0;
    this.slowMode = false;
    this.time = 0;
    this.particles = [];
    this.tracers = [];
    this.lastViewProjection = mat4Identity();
    this.cameraPosition = new Float32Array([0, 1.9, 7.8]);
    this.projection = mat4Identity();
    this.view = mat4Identity();
    this.viewProjection = mat4Identity();
    this.identityView = mat4Identity();
    this.fogColor = new Float32Array([.35, .58, .62]);
    this.sunColor = new Float32Array([1, .94, .78]);

    this.gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    }) || canvas.getContext('experimental-webgl');

    if (this.gl) {
      this.mode = 'webgl';
      this.initialiseWebGL();
    } else {
      this.mode = 'canvas';
      this.context2d = canvas.getContext('2d', { alpha: false });
      if (!this.context2d) throw new Error('Grafikkmotoren kunne ikke initialiseres.');
    }
    this.buildWorld();
  }

  initialiseWebGL() {
    const gl = this.gl;
    this.programs = {
      sky: createProgram(gl, SKY_VERTEX, SKY_FRAGMENT),
      mesh: createProgram(gl, MESH_VERTEX, MESH_FRAGMENT),
      line: createProgram(gl, LINE_VERTEX, LINE_FRAGMENT),
      particle: createProgram(gl, PARTICLE_VERTEX, PARTICLE_FRAGMENT),
    };
    this.locations = {
      sky: {
        position: gl.getAttribLocation(this.programs.sky, 'aPosition'),
        time: gl.getUniformLocation(this.programs.sky, 'uTime'),
        progress: gl.getUniformLocation(this.programs.sky, 'uProgress'),
        aim: gl.getUniformLocation(this.programs.sky, 'uAim'),
      },
      mesh: {
        position: gl.getAttribLocation(this.programs.mesh, 'aPosition'),
        normal: gl.getAttribLocation(this.programs.mesh, 'aNormal'),
        uv: gl.getAttribLocation(this.programs.mesh, 'aUv'),
        model: gl.getUniformLocation(this.programs.mesh, 'uModel'),
        viewProjection: gl.getUniformLocation(this.programs.mesh, 'uViewProjection'),
        normalMatrix: gl.getUniformLocation(this.programs.mesh, 'uNormalMatrix'),
        baseColor: gl.getUniformLocation(this.programs.mesh, 'uBaseColor'),
        cameraPosition: gl.getUniformLocation(this.programs.mesh, 'uCameraPosition'),
        sunDirection: gl.getUniformLocation(this.programs.mesh, 'uSunDirection'),
        sunColor: gl.getUniformLocation(this.programs.mesh, 'uSunColor'),
        fogColor: gl.getUniformLocation(this.programs.mesh, 'uFogColor'),
        texture: gl.getUniformLocation(this.programs.mesh, 'uTexture'),
        useTexture: gl.getUniformLocation(this.programs.mesh, 'uUseTexture'),
        alpha: gl.getUniformLocation(this.programs.mesh, 'uAlpha'),
        emissive: gl.getUniformLocation(this.programs.mesh, 'uEmissive'),
        fogStrength: gl.getUniformLocation(this.programs.mesh, 'uFogStrength'),
      },
      line: {
        position: gl.getAttribLocation(this.programs.line, 'aPosition'),
        viewProjection: gl.getUniformLocation(this.programs.line, 'uViewProjection'),
        color: gl.getUniformLocation(this.programs.line, 'uColor'),
      },
      particle: {
        position: gl.getAttribLocation(this.programs.particle, 'aPosition'),
        color: gl.getAttribLocation(this.programs.particle, 'aColor'),
        size: gl.getAttribLocation(this.programs.particle, 'aSize'),
        viewProjection: gl.getUniformLocation(this.programs.particle, 'uViewProjection'),
        pixelRatio: gl.getUniformLocation(this.programs.particle, 'uPixelRatio'),
      },
    };

    this.meshes = {
      cube: createMesh(gl, cubeGeometry()),
      quad: createMesh(gl, quadGeometry()),
      pyramid: createMesh(gl, pyramidGeometry()),
    };

    this.skyBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.dynamicLineBuffer = gl.createBuffer();
    this.particleBuffers = {
      position: gl.createBuffer(),
      color: gl.createBuffer(),
      size: gl.createBuffer(),
    };

    this.textures = {
      normal: createTexture(gl, createTicketCanvas('normal')),
      priority: createTexture(gl, createTicketCanvas('priority')),
      legacy: createTexture(gl, createTicketCanvas('legacy')),
      major: createTexture(gl, createTicketCanvas('major')),
      screen: createTexture(gl, createScreenCanvas()),
      facade: createTexture(gl, createFacadeCanvas()),
      shadow: createTexture(gl, createRadialCanvas('rgba(0, 9, 16, .65)')),
      glow: createTexture(gl, createRadialCanvas('rgba(255, 224, 105, 1)', 'rgba(255, 111, 24, 0)')),
      tealGlow: createTexture(gl, createRadialCanvas('rgba(91, 224, 193, .9)', 'rgba(91, 224, 193, 0)')),
    };

    const grid = [];
    for (let x = -30; x <= 30; x += 2) grid.push(x, -1.27, -2, x, -1.27, -55);
    for (let z = -2; z >= -55; z -= 2) grid.push(-30, -1.27, z, 30, -1.27, z);
    this.gridMesh = createLineMesh(gl, grid);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.03, 0.1, 0.15, 1);
  }

  buildWorld() {
    const random = seededRandom(4605);
    this.buildings = [];
    for (let index = 0; index < 20; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = -15 - random() * 35;
      const x = side * (7 + random() * 18);
      const width = 1.8 + random() * 4;
      const height = 1.7 + random() * 6.2;
      const depth = 2 + random() * 5;
      this.buildings.push({ x, y: -1.15 + height / 2, z, width, height, depth, tone: random() });
    }

    this.mountains = [];
    for (let index = 0; index < 15; index += 1) {
      const x = -39 + index * 4.5 + (random() - .5) * 4;
      const z = -38 - random() * 19;
      this.mountains.push({ x, z, width: 8 + random() * 10, height: 7 + random() * 13, depth: 6 + random() * 9, tone: random() });
    }

    this.trees = [];
    for (let index = 0; index < 18; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      this.trees.push({
        x: side * (5.5 + random() * 13),
        z: -5 - random() * 29,
        scale: .7 + random() * 1.25,
        phase: random() * Math.PI * 2,
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const mobile = this.width < 720;
    this.dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
    const pixelWidth = Math.max(1, Math.round(this.width * this.dpr));
    const pixelHeight = Math.max(1, Math.round(this.height * this.dpr));
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.aspect = this.width / this.height;
    mat4Perspective(this.projection, (mobile ? 61 : 54) * DEG, this.aspect, .1, 90);
    if (this.gl) this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    else this.context2d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setAim(normalizedX, normalizedY) {
    this.aimX = clamp(normalizedX, -1, 1);
    this.aimY = clamp(normalizedY, -1, 1);
  }

  setProgress(progress) {
    this.progress = clamp(progress, 0, 1);
  }

  setSlowMode(active) {
    this.slowMode = Boolean(active);
  }

  pulseLevel() {
    this.levelFlash = 1;
    this.shake = Math.max(this.shake, .24);
    const color = hexToRgb('#5be0c1');
    for (let index = 0; index < 34; index += 1) {
      const angle = (index / 34) * Math.PI * 2;
      this.particles.push({
        x: Math.cos(angle) * 2.2,
        y: 1.7 + Math.sin(angle) * 1.3,
        z: -8,
        vx: Math.cos(angle) * 1.7,
        vy: Math.sin(angle) * 1.2,
        vz: -.2,
        gravity: 0,
        color,
        life: .9,
        maxLife: .9,
        size: 1.4,
      });
    }
  }

  fire(target = null) {
    this.recoil = 1;
    this.muzzle = 1;
    this.shake = Math.max(this.shake, target ? .34 : .18);
    const start = [0.58 + this.aimX * .1, -.12 - this.aimY * .04, 5.5];
    const end = target
      ? [target.x, target.y, target.z]
      : [this.aimX * 10, 1.8 - this.aimY * 5, -17];
    this.tracers.push({ start, end, life: .13, maxLife: .13, hit: Boolean(target) });
  }

  emitHit(target) {
    const palette = TARGET_COLORS[target.kind] || TARGET_COLORS.normal;
    const colors = [hexToRgb(palette.edge), hexToRgb(palette.glow), hexToRgb('#fff6d1')];
    const count = this.reducedMotion ? 12 : 36;
    for (let index = 0; index < count; index += 1) {
      const theta = Math.random() * Math.PI * 2;
      const speed = .9 + Math.random() * 4.2;
      this.particles.push({
        x: target.x,
        y: target.y,
        z: target.z + .2,
        vx: Math.cos(theta) * speed,
        vy: (Math.random() - .15) * speed,
        vz: .8 + Math.random() * 2.5,
        gravity: 4.2 + Math.random() * 2,
        color: colors[index % colors.length],
        life: .55 + Math.random() * .55,
        maxLife: 1.1,
        size: 1 + Math.random() * 2.8,
      });
    }
  }

  emitEscape(target) {
    const color = hexToRgb('#ff6f68');
    for (let index = 0; index < 12; index += 1) {
      this.particles.push({
        x: target.x,
        y: target.y,
        z: target.z,
        vx: (Math.random() - .5) * 1.5,
        vy: Math.random() * 1.8,
        vz: (Math.random() - .5) * 1.2,
        gravity: 2.4,
        color,
        life: .35 + Math.random() * .45,
        maxLife: .8,
        size: .8 + Math.random() * 1.6,
      });
    }
  }

  update(deltaSeconds) {
    this.time += deltaSeconds;
    this.cameraAimX = damp(this.cameraAimX, this.aimX, 5.4, deltaSeconds);
    this.cameraAimY = damp(this.cameraAimY, this.aimY, 5.4, deltaSeconds);
    this.recoil = Math.max(0, this.recoil - deltaSeconds * 6.8);
    this.muzzle = Math.max(0, this.muzzle - deltaSeconds * 10.5);
    this.shake = Math.max(0, this.shake - deltaSeconds * 3.5);
    this.levelFlash = Math.max(0, this.levelFlash - deltaSeconds * 1.8);

    for (const particle of this.particles) {
      particle.life -= deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.z += particle.vz * deltaSeconds;
      particle.vy -= particle.gravity * deltaSeconds;
      particle.vx *= Math.pow(.3, deltaSeconds);
      particle.vz *= Math.pow(.45, deltaSeconds);
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const tracer of this.tracers) tracer.life -= deltaSeconds;
    this.tracers = this.tracers.filter((tracer) => tracer.life > 0);
  }

  updateCamera() {
    const shakeX = this.reducedMotion ? 0 : (Math.random() - .5) * this.shake * .12;
    const shakeY = this.reducedMotion ? 0 : (Math.random() - .5) * this.shake * .09;
    const sway = this.reducedMotion ? 0 : Math.sin(this.time * .72) * .025;
    this.cameraPosition[0] = this.cameraAimX * .42 + shakeX + sway;
    this.cameraPosition[1] = 1.82 - this.cameraAimY * .12 + shakeY + this.recoil * .025;
    this.cameraPosition[2] = 7.8 + this.recoil * .08;
    const center = [this.cameraAimX * 1.35, 1.25 - this.cameraAimY * .82, -11.5];
    mat4LookAt(this.view, this.cameraPosition, center, [0, 1, 0]);
    mat4Multiply(this.viewProjection, this.projection, this.view);
    this.lastViewProjection.set(this.viewProjection);

    const fogMorning = [0.34, 0.58, 0.61];
    const fogDusk = [0.18, 0.16, 0.24];
    this.fogColor.set(mixColor(fogMorning, fogDusk, this.progress));
    this.sunColor.set(mixColor([1, .96, .82], [1, .67, .48], this.progress));
  }

  render(scene) {
    this.updateCamera();
    if (this.mode === 'webgl') this.renderWebGL(scene);
    else this.renderCanvas(scene);
  }

  renderWebGL(scene) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.renderSky();
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    this.renderWorld();

    const orderedTargets = [...scene.targets].sort((a, b) => a.z - b.z);
    for (const target of orderedTargets) {
      this.renderTargetShadow(target);
      this.renderTarget(target);
    }
    this.renderTracers();
    this.renderParticles();
    this.renderGun();
  }

  renderSky() {
    const gl = this.gl;
    const program = this.programs.sky;
    const locations = this.locations.sky;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(locations.time, this.time);
    gl.uniform1f(locations.progress, this.progress);
    gl.uniform2f(locations.aim, this.cameraAimX, this.cameraAimY);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  renderWorld() {
    const progress = this.progress;
    const groundColor = mixColor(hexToRgb('#163d36'), hexToRgb('#101b2b'), progress);
    this.drawMesh(this.meshes.cube, composeTransform({ position: [0, -1.38, -27], scale: [64, .18, 56] }), {
      color: groundColor,
      fogStrength: 1,
    });

    this.drawMesh(this.meshes.cube, composeTransform({ position: [0, -1.23, -22], scale: [6.3, .08, 39] }), {
      color: mixColor(hexToRgb('#122a2e'), hexToRgb('#151421'), progress),
      emissive: .12,
      fogStrength: .6,
    });

    for (let index = 0; index < 11; index += 1) {
      this.drawMesh(this.meshes.cube, composeTransform({ position: [0, -1.14, -4.6 - index * 3.4], scale: [.13, .04, 1.2] }), {
        color: mixColor(hexToRgb('#65d9b9'), hexToRgb('#ffb56b'), progress),
        emissive: .72,
        fogStrength: .75,
      });
    }

    this.renderGrid();

    for (const mountain of this.mountains) {
      const tone = mixColor(
        mixColor(hexToRgb('#346d68'), hexToRgb('#204f58'), mountain.tone),
        mixColor(hexToRgb('#322b43'), hexToRgb('#1b263b'), mountain.tone),
        progress,
      );
      this.drawMesh(this.meshes.pyramid, composeTransform({
        position: [mountain.x, -1.2 + mountain.height * .42, mountain.z],
        rotation: [0, mountain.tone * 1.7, 0],
        scale: [mountain.width, mountain.height, mountain.depth],
      }), { color: tone, fogStrength: 1 });
    }

    for (const building of this.buildings) {
      const base = mixColor(hexToRgb('#244d50'), hexToRgb('#203040'), building.tone);
      const dusk = mixColor(base, hexToRgb('#171c2a'), progress * .68);
      const buildingModel = composeTransform({
        position: [building.x, building.y, building.z],
        rotation: [0, (building.tone - .5) * .12, 0],
        scale: [building.width, building.height, building.depth],
      });
      this.drawMesh(this.meshes.cube, buildingModel, { color: dusk, fogStrength: 1 });

      const facadeLocal = composeTransform({ position: [0, 0, .506], scale: [.78, .86, 1] });
      const facadeModel = mat4Multiply(new Float32Array(16), buildingModel, facadeLocal);
      this.drawTexturedQuad(facadeModel, this.textures.facade, {
        color: mixColor(hexToRgb('#7de4cb'), hexToRgb('#ffbf67'), progress),
        alpha: .998,
        emissive: .88,
        fogStrength: 1,
      });
    }

    for (const tree of this.trees) {
      const sway = this.reducedMotion ? 0 : Math.sin(this.time * .85 + tree.phase) * .03;
      this.drawMesh(this.meshes.cube, composeTransform({
        position: [tree.x, -.65, tree.z],
        rotation: [0, 0, sway],
        scale: [.25 * tree.scale, 1.5 * tree.scale, .25 * tree.scale],
      }), { color: hexToRgb('#27342e'), fogStrength: 1 });
      this.drawMesh(this.meshes.pyramid, composeTransform({
        position: [tree.x, .35 * tree.scale, tree.z],
        rotation: [0, tree.phase, sway],
        scale: [1.45 * tree.scale, 2.3 * tree.scale, 1.45 * tree.scale],
      }), { color: mixColor(hexToRgb('#1e5747'), hexToRgb('#152d39'), this.progress), fogStrength: 1 });
    }

    if (this.levelFlash > 0) {
      this.drawTexturedQuad(composeTransform({ position: [0, 1.6, -7.5], scale: [12, 7, 1] }), this.textures.tealGlow, {
        color: [1, 1, 1],
        alpha: this.levelFlash * .2,
        emissive: 1,
        fogStrength: 0,
        additive: true,
      });
    }
  }

  renderGrid() {
    const gl = this.gl;
    const program = this.programs.line;
    const locations = this.locations.line;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridMesh.buffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(locations.viewProjection, false, this.viewProjection);
    const color = mixColor(hexToRgb('#6ed2b5'), hexToRgb('#a85f68'), this.progress);
    gl.uniform4f(locations.color, color[0], color[1], color[2], .17);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.drawArrays(gl.LINES, 0, this.gridMesh.count);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  targetModel(target) {
    return composeTransform({
      position: [target.x, target.y, target.z],
      rotation: [target.pitch || 0, target.yaw || 0, target.roll || 0],
      scale: [target.width, target.height, target.depth],
    });
  }

  renderTargetShadow(target) {
    if (target.hit) return;
    const distance = Math.max(.6, target.y + 1.2);
    const alpha = clamp(.34 - distance * .025, .12, .32) * (target.opacity ?? 1);
    const shadowModel = composeTransform({
      position: [target.x, -1.275, target.z],
      rotation: [-Math.PI / 2, 0, 0],
      scale: [target.width * (1 + distance * .18), target.depth * 2.4 + distance * .25, 1],
    });
    this.drawTexturedQuad(shadowModel, this.textures.shadow, {
      color: [1, 1, 1],
      alpha,
      emissive: 1,
      fogStrength: 1,
      doubleSided: true,
    });
  }

  renderTarget(target) {
    const palette = TARGET_COLORS[target.kind] || TARGET_COLORS.normal;
    const model = this.targetModel(target);
    target.modelMatrix = model;

    if (target.kind === 'major' && !target.hit) {
      const pulse = 1 + Math.sin(this.time * 4.6 + target.id) * .07;
      const haloModel = composeTransform({
        position: [target.x, target.y, target.z - .34],
        rotation: [0, 0, target.roll || 0],
        scale: [target.width * 1.55 * pulse, target.height * 2.35 * pulse, 1],
      });
      this.drawTexturedQuad(haloModel, this.textures.glow, {
        color: [1, .72, .24],
        alpha: .17 + Math.sin(this.time * 5.2) * .035,
        emissive: 1,
        fogStrength: .45,
        additive: true,
        doubleSided: true,
      });
    }

    this.drawMesh(this.meshes.cube, model, {
      color: hexToRgb(palette.body),
      alpha: target.opacity ?? 1,
      emissive: target.hit ? .42 : .08,
      fogStrength: 1,
    });

    const frontLocal = composeTransform({ position: [0, 0, .506], scale: [.965, .91, 1] });
    const frontModel = mat4Multiply(new Float32Array(16), model, frontLocal);
    this.drawTexturedQuad(frontModel, this.textures[target.kind] || this.textures.normal, {
      color: [1, 1, 1],
      alpha: target.opacity ?? 1,
      emissive: .38 + (this.slowMode ? .12 : 0),
      fogStrength: 1,
    });

    const statusLocal = composeTransform({ position: [.37, .35, .516], scale: [.12, .12, 1] });
    const statusModel = mat4Multiply(new Float32Array(16), model, statusLocal);
    this.drawTexturedQuad(statusModel, this.textures.tealGlow, {
      color: target.kind === 'major' ? hexToRgb('#ffd85a') : target.kind === 'priority' ? hexToRgb('#ff6f68') : hexToRgb('#5be0c1'),
      alpha: .72 + Math.sin(this.time * 5 + target.id) * .18,
      emissive: 1,
      fogStrength: 1,
      additive: true,
    });

    target.screenBounds = this.calculateBounds(model);
  }

  calculateBounds(model) {
    const modelViewProjection = mat4Multiply(new Float32Array(16), this.viewProjection, model);
    const corners = [
      [-.5, -.5, -.5], [.5, -.5, -.5], [-.5, .5, -.5], [.5, .5, -.5],
      [-.5, -.5, .5], [.5, -.5, .5], [-.5, .5, .5], [.5, .5, .5],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let visible = false;
    for (const corner of corners) {
      const point = projectPoint(corner, modelViewProjection, this.width, this.height);
      if (!point) continue;
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      visible ||= point.visible;
    }
    if (!Number.isFinite(minX)) return null;
    const padding = clamp((maxY - minY) * .16, 8, 22);
    return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding, visible };
  }

  renderTracers() {
    if (!this.tracers.length) return;
    const gl = this.gl;
    const program = this.programs.line;
    const locations = this.locations.line;
    gl.useProgram(program);
    gl.uniformMatrix4fv(locations.viewProjection, false, this.viewProjection);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicLineBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    for (const tracer of this.tracers) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...tracer.start, ...tracer.end]), gl.DYNAMIC_DRAW);
      const alpha = clamp(tracer.life / tracer.maxLife, 0, 1);
      const color = tracer.hit ? hexToRgb('#fff1a0') : hexToRgb('#8fffe0');
      gl.uniform4f(locations.color, color[0], color[1], color[2], alpha * .86);
      gl.drawArrays(gl.LINES, 0, 2);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  renderParticles() {
    if (!this.particles.length) return;
    const gl = this.gl;
    const positions = [];
    const colors = [];
    const sizes = [];
    for (const particle of this.particles) {
      positions.push(particle.x, particle.y, particle.z);
      colors.push(...particle.color, clamp(particle.life / particle.maxLife, 0, 1));
      sizes.push(particle.size);
    }
    const program = this.programs.particle;
    const locations = this.locations.particle;
    gl.useProgram(program);
    gl.uniformMatrix4fv(locations.viewProjection, false, this.viewProjection);
    gl.uniform1f(locations.pixelRatio, this.dpr);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locations.color);
    gl.vertexAttribPointer(locations.color, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffers.size);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locations.size);
    gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, this.particles.length);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  renderGun() {
    const gl = this.gl;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const mobile = this.width < 720;
    const aimOffsetX = this.cameraAimX * .09;
    const aimOffsetY = this.cameraAimY * .045;
    const kick = this.recoil * this.recoil;
    const gunScale = mobile ? .58 : .82;
    const root = composeTransform({
      position: [mobile ? .38 + aimOffsetX * .42 : .78 + aimOffsetX, mobile ? -.82 - aimOffsetY - kick * .06 : -.79 - aimOffsetY - kick * .07, mobile ? -2.58 + kick * .13 : -2.52 + kick * .15],
      rotation: [-.14 - kick * .075, -.26 + aimOffsetX * .42, -.05 - aimOffsetX * .16],
      scale: [gunScale, gunScale, gunScale],
    });
    const gunParts = [
      { p: [0, 0, 0], s: [.55, .31, .84], c: '#168b7d', e: .14 },
      { p: [0, .2, -.2], s: [.45, .105, .73], c: '#4ed4b3', e: .17 },
      { p: [0, .025, -.84], s: [.16, .145, .92], c: '#324a4e', e: .04 },
      { p: [0, .03, -1.36], s: [.21, .19, .17], c: '#182a31', e: .03 },
      { p: [-.02, -.43, .18], s: [.25, .59, .31], c: '#20363b', e: .02, r: [0, 0, .12] },
      { p: [.21, -.25, .14], s: [.07, .22, .18], c: '#ffd85a', e: .7 },
      { p: [0, .36, -.35], s: [.105, .14, .28], c: '#ffd85a', e: .72 },
    ];
    for (const part of gunParts) {
      const local = composeTransform({ position: part.p, rotation: part.r || [0, 0, 0], scale: part.s });
      const model = mat4Multiply(new Float32Array(16), root, local);
      this.drawMesh(this.meshes.cube, model, {
        color: hexToRgb(part.c),
        emissive: part.e,
        fogStrength: 0,
        viewProjection: this.projection,
        cameraPosition: [0, 0, 0],
      });
    }

    const screenLocal = composeTransform({ position: [0, .01, .431], scale: [.66, .41, 1] });
    const screenModel = mat4Multiply(new Float32Array(16), root, screenLocal);
    this.drawTexturedQuad(screenModel, this.textures.screen, {
      color: [1, 1, 1],
      emissive: .9,
      fogStrength: 0,
      viewProjection: this.projection,
      cameraPosition: [0, 0, 0],
    });

    if (this.muzzle > 0) {
      const flashAlpha = this.muzzle * (.72 + Math.random() * .28);
      const flashLocal = composeTransform({
        position: [0, .03, -1.54],
        rotation: [0, 0, this.time * 8],
        scale: [.8 + this.muzzle * .6, .8 + this.muzzle * .6, 1],
      });
      const flashModel = mat4Multiply(new Float32Array(16), root, flashLocal);
      this.drawTexturedQuad(flashModel, this.textures.glow, {
        color: [1, 1, 1],
        alpha: flashAlpha,
        emissive: 1,
        fogStrength: 0,
        additive: true,
        doubleSided: true,
        viewProjection: this.projection,
        cameraPosition: [0, 0, 0],
      });
    }
  }

  drawTexturedQuad(model, texture, options = {}) {
    this.drawMesh(this.meshes.quad, model, { ...options, texture, doubleSided: options.doubleSided ?? true });
  }

  drawMesh(mesh, model, {
    color = [1, 1, 1],
    texture = null,
    alpha = 1,
    emissive = 0,
    fogStrength = 1,
    additive = false,
    doubleSided = false,
    viewProjection = this.viewProjection,
    cameraPosition = this.cameraPosition,
  } = {}) {
    const gl = this.gl;
    const program = this.programs.mesh;
    const locations = this.locations.mesh;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
    gl.enableVertexAttribArray(locations.normal);
    gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
    gl.enableVertexAttribArray(locations.uv);
    gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.index);

    gl.uniformMatrix4fv(locations.model, false, model);
    gl.uniformMatrix4fv(locations.viewProjection, false, viewProjection);
    gl.uniformMatrix3fv(locations.normalMatrix, false, normalMatrixFromMat4(new Float32Array(9), model));
    gl.uniform3fv(locations.baseColor, color);
    gl.uniform3fv(locations.cameraPosition, cameraPosition);
    gl.uniform3f(locations.sunDirection, -.45, -.8, -.32);
    gl.uniform3fv(locations.sunColor, this.sunColor);
    gl.uniform3fv(locations.fogColor, this.fogColor);
    gl.uniform1f(locations.alpha, alpha);
    gl.uniform1f(locations.emissive, emissive);
    gl.uniform1f(locations.fogStrength, fogStrength);
    gl.uniform1f(locations.useTexture, texture ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture || this.textures?.normal || null);
    gl.uniform1i(locations.texture, 0);

    if (doubleSided) gl.disable(gl.CULL_FACE);
    else gl.enable(gl.CULL_FACE);
    const transparent = alpha < .999 || additive || texture === this.textures?.shadow || texture === this.textures?.glow || texture === this.textures?.tealGlow;
    if (transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    }
    gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_SHORT, 0);
    if (transparent) {
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    if (doubleSided) gl.enable(gl.CULL_FACE);
  }

  renderCanvas(scene) {
    const context = this.context2d;
    const width = this.width;
    const height = this.height;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, this.progress < .5 ? '#123b54' : '#111a3b');
    sky.addColorStop(.68, this.progress < .5 ? '#76bbb6' : '#b45f55');
    sky.addColorStop(1, '#d9bd7a');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    const horizon = height * .67;
    context.fillStyle = this.progress < .6 ? '#174239' : '#171f30';
    context.fillRect(0, horizon, width, height - horizon);
    context.save();
    context.globalAlpha = .24;
    context.strokeStyle = '#86e4c2';
    for (let index = -10; index <= 10; index += 1) {
      context.beginPath();
      context.moveTo(width / 2 + index * 4, horizon);
      context.lineTo(width / 2 + index * width * .13, height);
      context.stroke();
    }
    for (let row = 0; row < 11; row += 1) {
      const p = row / 10;
      const y = horizon + (height - horizon) * p * p;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();

    for (const target of [...scene.targets].sort((a, b) => a.z - b.z)) {
      const scale = clamp(470 / Math.abs(target.z - 7.8), .28, 1.55);
      const x = width / 2 + target.x * scale * 52;
      const y = height * .49 - target.y * scale * 48;
      const targetWidth = target.width * scale * 58;
      const targetHeight = target.height * scale * 58;
      const depth = target.depth * scale * 28;
      const palette = TARGET_COLORS[target.kind] || TARGET_COLORS.normal;
      context.save();
      context.globalAlpha = target.opacity ?? 1;
      context.translate(x, y);
      context.rotate(target.roll || 0);
      context.fillStyle = 'rgba(0,0,0,.25)';
      context.beginPath();
      context.ellipse(depth, targetHeight * .75, targetWidth * .56, targetHeight * .2, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.edge;
      context.beginPath();
      context.moveTo(-targetWidth / 2, -targetHeight / 2);
      context.lineTo(-targetWidth / 2 + depth, -targetHeight / 2 - depth);
      context.lineTo(targetWidth / 2 + depth, -targetHeight / 2 - depth);
      context.lineTo(targetWidth / 2, -targetHeight / 2);
      context.closePath();
      context.fill();
      context.fillStyle = '#44231f';
      context.beginPath();
      context.moveTo(targetWidth / 2, -targetHeight / 2);
      context.lineTo(targetWidth / 2 + depth, -targetHeight / 2 - depth);
      context.lineTo(targetWidth / 2 + depth, targetHeight / 2 - depth);
      context.lineTo(targetWidth / 2, targetHeight / 2);
      context.closePath();
      context.fill();
      if (target.kind === 'major') {
        context.shadowColor = palette.glow;
        context.shadowBlur = 28;
      }
      context.fillStyle = palette.body;
      makeRoundedPath(context, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight, 9);
      context.fill();
      context.strokeStyle = palette.light;
      context.lineWidth = target.kind === 'major' ? 4 : 2;
      context.stroke();
      context.shadowBlur = 0;
      context.fillStyle = '#0a2227';
      makeRoundedPath(context, -targetWidth * .42, -targetHeight * .18, targetWidth * .84, targetHeight * .44, 7);
      context.fill();
      context.fillStyle = palette.light;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `900 ${clamp(targetWidth * .09, 9, 17)}px system-ui, sans-serif`;
      context.fillText(target.kind === 'major' ? 'Hovedhendelse' : 'Brukerstøttesak', 0, targetHeight * .02, targetWidth * .78);
      context.restore();
      target.screenBounds = {
        minX: x - targetWidth / 2 - 12,
        minY: y - targetHeight / 2 - depth - 12,
        maxX: x + targetWidth / 2 + depth + 12,
        maxY: y + targetHeight / 2 + 12,
        visible: true,
      };
    }

    context.save();
    context.translate(width * .68 + this.aimX * 16, height * .87 - this.aimY * 7 + this.recoil * 9);
    context.rotate(-.08 + this.aimX * .03);
    context.fillStyle = '#17373c';
    makeRoundedPath(context, -58, -36, 116, 72, 13);
    context.fill();
    context.fillStyle = '#2eb9a1';
    makeRoundedPath(context, -52, -31, 104, 47, 10);
    context.fill();
    context.fillStyle = '#071c22';
    makeRoundedPath(context, -38, -22, 76, 29, 6);
    context.fill();
    context.fillStyle = '#b6ffe8';
    context.font = '900 10px ui-monospace, monospace';
    context.textAlign = 'center';
    context.fillText('SERVICE MANAGER', 0, -7);
    context.fillStyle = '#1c3035';
    makeRoundedPath(context, -14, 15, 28, 70, 7);
    context.fill();
    context.fillStyle = '#344d50';
    context.fillRect(-10, -85, 20, 53);
    if (this.muzzle > 0) {
      context.fillStyle = `rgba(255,221,90,${this.muzzle})`;
      context.beginPath();
      context.arc(0, -91, 20 + this.muzzle * 20, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  getTargetAt(screenX, screenY, targets) {
    const candidates = [...targets]
      .filter((target) => !target.hit && target.screenBounds?.visible)
      .sort((a, b) => b.z - a.z);
    return candidates.find((target) => {
      const bounds = target.screenBounds;
      return screenX >= bounds.minX && screenX <= bounds.maxX && screenY >= bounds.minY && screenY <= bounds.maxY;
    }) || null;
  }

  projectWorld(position) {
    return projectPoint(position, this.lastViewProjection, this.width, this.height);
  }

  get info() {
    return {
      mode: this.mode,
      label: this.mode === 'webgl' ? 'WebGL 3D' : 'Canvas-reserve',
      dpr: this.dpr,
    };
  }
}
