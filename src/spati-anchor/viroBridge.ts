// Bridges Viro's per-anchor pose (position + Euler degrees) into a column-major
// Mat4. Compose direction only — the inverse decompose is added when real rotated
// survey data needs it (validation data is translation-only). Rotation order:
// R = Rz ∘ Ry ∘ Rx (apply X, then Y, then Z), matching three.js-derived Viro.
import { type Mat4, type Vec3, multiplyMat4, rigidMat4 } from './mat4';

const d2r = (deg: number): number => (deg * Math.PI) / 180;

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
