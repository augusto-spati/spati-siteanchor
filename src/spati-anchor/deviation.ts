// Phase E3 (core): the deviation primitives for on-site "as-built vs model"
// checks. Given a real-world point (from an AR hit-test on device) and a model
// reference — another point, or a plane like a wall — compute the gap. The
// raycast that yields the real point is device work; this math is pure + tested.
import type { Vec3 } from './mat4';

export function distancePointToPoint(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Signed distance from `point` to the plane through `planePoint` with normal
 * `planeNormal` (need not be unit — it is normalized here). Positive = on the
 * side the normal points to; magnitude = how far the built point deviates from
 * the model surface. Returns NaN for a degenerate (zero-length) normal.
 */
export function signedDistancePointToPlane(point: Vec3, planePoint: Vec3, planeNormal: Vec3): number {
  const len = Math.sqrt(
    planeNormal[0] * planeNormal[0] + planeNormal[1] * planeNormal[1] + planeNormal[2] * planeNormal[2],
  );
  if (len === 0) return NaN;
  const nx = planeNormal[0] / len;
  const ny = planeNormal[1] / len;
  const nz = planeNormal[2] / len;
  return (point[0] - planePoint[0]) * nx + (point[1] - planePoint[1]) * ny + (point[2] - planePoint[2]) * nz;
}
