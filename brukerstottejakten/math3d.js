export const EPSILON = 1e-6;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(EPSILON, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function damp(current, target, smoothing, deltaSeconds) {
  return lerp(current, target, 1 - Math.exp(-smoothing * deltaSeconds));
}

export function vec3(x = 0, y = 0, z = 0) {
  return new Float32Array([x, y, z]);
}

export function vec3Length(value) {
  return Math.hypot(value[0], value[1], value[2]);
}

export function vec3Normalize(out, value) {
  const length = vec3Length(value) || 1;
  out[0] = value[0] / length;
  out[1] = value[1] / length;
  out[2] = value[2] / length;
  return out;
}

export function vec3Subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function vec3Cross(out, a, b) {
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

export function mat4Identity(out = new Float32Array(16)) {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function mat4Copy(out, matrix) {
  out.set(matrix);
  return out;
}

export function mat4Multiply(out, a, b) {
  const a00 = a[0];
  const a01 = a[1];
  const a02 = a[2];
  const a03 = a[3];
  const a10 = a[4];
  const a11 = a[5];
  const a12 = a[6];
  const a13 = a[7];
  const a20 = a[8];
  const a21 = a[9];
  const a22 = a[10];
  const a23 = a[11];
  const a30 = a[12];
  const a31 = a[13];
  const a32 = a[14];
  const a33 = a[15];

  const b00 = b[0];
  const b01 = b[1];
  const b02 = b[2];
  const b03 = b[3];
  const b10 = b[4];
  const b11 = b[5];
  const b12 = b[6];
  const b13 = b[7];
  const b20 = b[8];
  const b21 = b[9];
  const b22 = b[10];
  const b23 = b[11];
  const b30 = b[12];
  const b31 = b[13];
  const b32 = b[14];
  const b33 = b[15];

  out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
  out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
  out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
  out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
  out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
  out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
  out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
  out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
  out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
  out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
  out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
  out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
  out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
  out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
  return out;
}

export function mat4Perspective(out, fieldOfViewRadians, aspect, near, far) {
  const f = 1 / Math.tan(fieldOfViewRadians / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function mat4LookAt(out, eye, center, up) {
  const z = vec3();
  const x = vec3();
  const y = vec3();
  vec3Subtract(z, eye, center);
  vec3Normalize(z, z);
  vec3Cross(x, up, z);
  vec3Normalize(x, x);
  vec3Cross(y, z, x);

  out[0] = x[0];
  out[1] = y[0];
  out[2] = z[0];
  out[3] = 0;
  out[4] = x[1];
  out[5] = y[1];
  out[6] = z[1];
  out[7] = 0;
  out[8] = x[2];
  out[9] = y[2];
  out[10] = z[2];
  out[11] = 0;
  out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
  out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
  out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
  out[15] = 1;
  return out;
}

export function mat4Translate(out, matrix, x, y, z) {
  if (out !== matrix) mat4Copy(out, matrix);
  out[12] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  out[13] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  out[14] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  out[15] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  return out;
}

export function mat4Scale(out, matrix, x, y, z) {
  out[0] = matrix[0] * x;
  out[1] = matrix[1] * x;
  out[2] = matrix[2] * x;
  out[3] = matrix[3] * x;
  out[4] = matrix[4] * y;
  out[5] = matrix[5] * y;
  out[6] = matrix[6] * y;
  out[7] = matrix[7] * y;
  out[8] = matrix[8] * z;
  out[9] = matrix[9] * z;
  out[10] = matrix[10] * z;
  out[11] = matrix[11] * z;
  out[12] = matrix[12];
  out[13] = matrix[13];
  out[14] = matrix[14];
  out[15] = matrix[15];
  return out;
}

export function mat4RotateX(out, matrix, radians) {
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  const a10 = matrix[4];
  const a11 = matrix[5];
  const a12 = matrix[6];
  const a13 = matrix[7];
  const a20 = matrix[8];
  const a21 = matrix[9];
  const a22 = matrix[10];
  const a23 = matrix[11];
  if (out !== matrix) {
    out[0] = matrix[0];
    out[1] = matrix[1];
    out[2] = matrix[2];
    out[3] = matrix[3];
    out[12] = matrix[12];
    out[13] = matrix[13];
    out[14] = matrix[14];
    out[15] = matrix[15];
  }
  out[4] = a10 * cosine + a20 * sine;
  out[5] = a11 * cosine + a21 * sine;
  out[6] = a12 * cosine + a22 * sine;
  out[7] = a13 * cosine + a23 * sine;
  out[8] = a20 * cosine - a10 * sine;
  out[9] = a21 * cosine - a11 * sine;
  out[10] = a22 * cosine - a12 * sine;
  out[11] = a23 * cosine - a13 * sine;
  return out;
}

export function mat4RotateY(out, matrix, radians) {
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  const a00 = matrix[0];
  const a01 = matrix[1];
  const a02 = matrix[2];
  const a03 = matrix[3];
  const a20 = matrix[8];
  const a21 = matrix[9];
  const a22 = matrix[10];
  const a23 = matrix[11];
  if (out !== matrix) {
    out[4] = matrix[4];
    out[5] = matrix[5];
    out[6] = matrix[6];
    out[7] = matrix[7];
    out[12] = matrix[12];
    out[13] = matrix[13];
    out[14] = matrix[14];
    out[15] = matrix[15];
  }
  out[0] = a00 * cosine - a20 * sine;
  out[1] = a01 * cosine - a21 * sine;
  out[2] = a02 * cosine - a22 * sine;
  out[3] = a03 * cosine - a23 * sine;
  out[8] = a00 * sine + a20 * cosine;
  out[9] = a01 * sine + a21 * cosine;
  out[10] = a02 * sine + a22 * cosine;
  out[11] = a03 * sine + a23 * cosine;
  return out;
}

export function mat4RotateZ(out, matrix, radians) {
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  const a00 = matrix[0];
  const a01 = matrix[1];
  const a02 = matrix[2];
  const a03 = matrix[3];
  const a10 = matrix[4];
  const a11 = matrix[5];
  const a12 = matrix[6];
  const a13 = matrix[7];
  if (out !== matrix) {
    out[8] = matrix[8];
    out[9] = matrix[9];
    out[10] = matrix[10];
    out[11] = matrix[11];
    out[12] = matrix[12];
    out[13] = matrix[13];
    out[14] = matrix[14];
    out[15] = matrix[15];
  }
  out[0] = a00 * cosine + a10 * sine;
  out[1] = a01 * cosine + a11 * sine;
  out[2] = a02 * cosine + a12 * sine;
  out[3] = a03 * cosine + a13 * sine;
  out[4] = a10 * cosine - a00 * sine;
  out[5] = a11 * cosine - a01 * sine;
  out[6] = a12 * cosine - a02 * sine;
  out[7] = a13 * cosine - a03 * sine;
  return out;
}

export function composeTransform({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const out = mat4Identity();
  mat4Translate(out, out, position[0], position[1], position[2]);
  mat4RotateZ(out, out, rotation[2]);
  mat4RotateY(out, out, rotation[1]);
  mat4RotateX(out, out, rotation[0]);
  mat4Scale(out, out, scale[0], scale[1], scale[2]);
  return out;
}

export function mat4TransformPoint(out, matrix, point) {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const divisor = w || 1;
  out[0] = (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / divisor;
  out[1] = (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / divisor;
  out[2] = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / divisor;
  return out;
}

export function mat4TransformPointRaw(out, matrix, point) {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
  out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
  out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
  out[3] = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  return out;
}

export function normalMatrixFromMat4(out = new Float32Array(9), matrix) {
  const a00 = matrix[0];
  const a01 = matrix[1];
  const a02 = matrix[2];
  const a10 = matrix[4];
  const a11 = matrix[5];
  const a12 = matrix[6];
  const a20 = matrix[8];
  const a21 = matrix[9];
  const a22 = matrix[10];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  let determinant = a00 * b01 + a01 * b11 + a02 * b21;
  determinant = determinant ? 1 / determinant : 1;

  out[0] = b01 * determinant;
  out[1] = (-a22 * a01 + a02 * a21) * determinant;
  out[2] = (a12 * a01 - a02 * a11) * determinant;
  out[3] = b11 * determinant;
  out[4] = (a22 * a00 - a02 * a20) * determinant;
  out[5] = (-a12 * a00 + a02 * a10) * determinant;
  out[6] = b21 * determinant;
  out[7] = (-a21 * a00 + a01 * a20) * determinant;
  out[8] = (a11 * a00 - a01 * a10) * determinant;
  return out;
}

export function projectPoint(point, viewProjection, width, height) {
  const clip = new Float32Array(4);
  mat4TransformPointRaw(clip, viewProjection, point);
  if (clip[3] <= EPSILON) return null;
  const inverseW = 1 / clip[3];
  const ndcX = clip[0] * inverseW;
  const ndcY = clip[1] * inverseW;
  const ndcZ = clip[2] * inverseW;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
    depth: ndcZ,
    visible: ndcZ >= -1 && ndcZ <= 1 && ndcX >= -1.25 && ndcX <= 1.25 && ndcY >= -1.25 && ndcY <= 1.25,
  };
}

export function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
