// Vendored from spati monorepo @spati/coordinates-contract@1.0.0 — keep in sync; do not diverge silently.
export type Vec3 = [number, number, number];
/** Column-major 4x4 as a flat length-16 array (glTF convention). */
export type Mat4 = number[];

export function identityMat4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function translationMat4(t: Vec3): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1];
}

/** Multiply two column-major 4x4 matrices: returns a ∘ b. */
export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = s;
    }
  }
  return out;
}

/** Apply a column-major 4x4 affine to a 3D point (implicit w = 1). */
export function applyMat4ToPoint(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z] = p;
  const tx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const ty = m[1] * x + m[5] * y + m[9] * z + m[13];
  const tz = m[2] * x + m[6] * y + m[10] * z + m[14];
  const tw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return tw !== 0 && tw !== 1 ? [tx / tw, ty / tw, tz / tw] : [tx, ty, tz];
}

/** Build a column-major rigid 4x4 from a 3x3 rotation (row-major nested) + translation. */
export function rigidMat4(rotationRowMajor: number[][], translation: Vec3): Mat4 {
  const r = rotationRowMajor;
  return [
    r[0][0], r[1][0], r[2][0], 0,
    r[0][1], r[1][1], r[2][1], 0,
    r[0][2], r[1][2], r[2][2], 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

/** Inverse of a RIGID column-major 4x4: M = [R|t] → M⁻¹ = [Rᵀ | −Rᵀt]. */
export function invertRigidMat4(m: Mat4): Mat4 {
  const rt: number[][] = [
    [m[0], m[1], m[2]],
    [m[4], m[5], m[6]],
    [m[8], m[9], m[10]],
  ];
  const t: Vec3 = [m[12], m[13], m[14]];
  const nt: Vec3 = [
    -(rt[0][0] * t[0] + rt[0][1] * t[1] + rt[0][2] * t[2]),
    -(rt[1][0] * t[0] + rt[1][1] * t[1] + rt[1][2] * t[2]),
    -(rt[2][0] * t[0] + rt[2][1] * t[1] + rt[2][2] * t[2]),
  ];
  return rigidMat4(rt, nt);
}
