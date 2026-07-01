import { describe, it, expect } from 'vitest';
import {
  identityMat4, translationMat4, multiplyMat4, applyMat4ToPoint,
  rigidMat4, invertRigidMat4, type Mat4,
} from './mat4';

// Rz(90°) + translation [1,2,3], column-major.
const M: Mat4 = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1];

describe('mat4', () => {
  it('multiply by identity is a no-op', () => {
    expect(multiplyMat4(M, identityMat4())).toEqual(M);
  });
  it('applies a rigid transform to a point', () => {
    // rotate [1,0,0] by 90° about Z -> [0,1,0], then + [1,2,3]
    expect(applyMat4ToPoint(M, [1, 0, 0])).toEqual([1, 3, 3]);
  });
  it('inverts a rigid transform (pin vector)', () => {
    expect(invertRigidMat4(M)).toEqual([0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, -2, 1, -3, 1]);
  });
  it('M ∘ M⁻¹ = identity', () => {
    const r = multiplyMat4(M, invertRigidMat4(M));
    r.forEach((v, i) => expect(v).toBeCloseTo(identityMat4()[i], 12));
  });
  it('translationMat4 builds the expected column-major matrix', () => {
    expect(translationMat4([1, 2, 3])).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1]);
  });
  it('rigidMat4 places rotation columns + translation', () => {
    expect(rigidMat4([[0, -1, 0], [1, 0, 0], [0, 0, 1]], [1, 2, 3])).toEqual(M);
  });
});
