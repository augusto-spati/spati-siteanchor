import { describe, it, expect } from 'vitest';
import { distancePointToPoint, signedDistancePointToPlane } from './deviation';
import type { Vec3 } from './mat4';

describe('distancePointToPoint', () => {
  it('3-4-5 triangle', () => {
    expect(distancePointToPoint([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 9);
  });
  it('zero for identical points', () => {
    expect(distancePointToPoint([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('signedDistancePointToPlane', () => {
  const planePoint: Vec3 = [0, 0, 0];
  it('positive on the normal side, using an un-normalized normal', () => {
    // Plane = XZ (normal +Y, given length 2 to prove normalization); point 3 above.
    expect(signedDistancePointToPlane([5, 3, -7], planePoint, [0, 2, 0])).toBeCloseTo(3, 9);
  });
  it('negative on the opposite side', () => {
    expect(signedDistancePointToPlane([0, -1.5, 0], planePoint, [0, 1, 0])).toBeCloseTo(-1.5, 9);
  });
  it('zero on the plane', () => {
    expect(signedDistancePointToPlane([9, 0, 9], planePoint, [0, 1, 0])).toBeCloseTo(0, 9);
  });
  it('NaN for a degenerate normal', () => {
    expect(Number.isNaN(signedDistancePointToPlane([1, 1, 1], planePoint, [0, 0, 0]))).toBe(true);
  });
});
