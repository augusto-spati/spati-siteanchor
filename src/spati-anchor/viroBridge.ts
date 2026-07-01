// Bridges Viro's per-anchor pose (position + Euler degrees) into a column-major
// Mat4. Compose direction only — the inverse decompose is added when real rotated
// survey data needs it (validation data is translation-only). Rotation order:
// R = Rz ∘ Ry ∘ Rx (apply X, then Y, then Z), matching three.js-derived Viro.
import { type Mat4, type Vec3, multiplyMat4, rigidMat4 } from './mat4';

const d2r = (deg: number): number => (deg * Math.PI) / 180;
const r2d = (rad: number): number => (rad * 180) / Math.PI;

function rotX(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[1, 0, 0], [0, c, -s], [0, s, c]], [0, 0, 0]);
}
function rotY(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[c, 0, s], [0, 1, 0], [-s, 0, c]], [0, 0, 0]);
}
function rotZ(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[c, -s, 0], [s, c, 0], [0, 0, 1]], [0, 0, 0]);
}

export function mat4FromPosEuler(position: Vec3, rotationDeg: Vec3): Mat4 {
  const R = multiplyMat4(
    rotZ(d2r(rotationDeg[2])),
    multiplyMat4(rotY(d2r(rotationDeg[1])), rotX(d2r(rotationDeg[0]))),
  );
  R[12] = position[0];
  R[13] = position[1];
  R[14] = position[2];
  return R;
}

/**
 * Inverse of mat4FromPosEuler: decompose a rigid Mat4 into Viro position + Euler
 * degrees in the SAME order (R = Rz·Ry·Rx), with a gimbal-lock fallback at
 * |cos y| ≈ 0. Guaranteed to rebuild the same rotation matrix (round-trip).
 *
 * The Euler ORDER must match how Viro's native side interprets a ViroNode
 * `rotation` prop. It is chosen as Z·Y·X and pinned against Viro on-device; if a
 * rotated model renders wrong, flip the order in BOTH this and mat4FromPosEuler
 * (they must always stay mutual inverses).
 */
export function posEulerFromMat4(m: Mat4): { position: Vec3; rotationDeg: Vec3 } {
  const clamp = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);
  // Column-major: R[row][col] = m[col*4 + row].
  const y = Math.asin(clamp(-m[2])); // R[2][0] = -sin(y)
  const cy = Math.cos(y);
  let x: number;
  let z: number;
  if (Math.abs(cy) > 1e-6) {
    x = Math.atan2(m[6], m[10]); // atan2(R[2][1], R[2][2])
    z = Math.atan2(m[1], m[0]); // atan2(R[1][0], R[0][0])
  } else {
    // Gimbal lock (y = ±90°): pin z = 0, recover x from the remaining terms.
    x = Math.atan2(-m[9], m[5]); // atan2(-R[1][2], R[1][1])
    z = 0;
  }
  return { position: [m[12], m[13], m[14]], rotationDeg: [r2d(x), r2d(y), r2d(z)] };
}
