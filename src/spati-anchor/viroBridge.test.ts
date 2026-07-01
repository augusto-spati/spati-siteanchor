import { describe, it, expect } from 'vitest';
import { mat4FromPosEuler, posEulerFromMat4 } from './viroBridge';
import { applyMat4ToPoint, translationMat4, type Vec3 } from './mat4';

describe('mat4FromPosEuler', () => {
  it('no rotation → pure translation', () => {
    const m = mat4FromPosEuler([1, 2, 3], [0, 0, 0]);
    m.forEach((v, i) => expect(v).toBeCloseTo(translationMat4([1, 2, 3])[i], 12));
  });
  it('90° about Z rotates the X axis to Y', () => {
    const m = mat4FromPosEuler([0, 0, 0], [0, 0, 90]);
    const p = applyMat4ToPoint(m, [1, 0, 0]);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(1, 6);
    expect(p[2]).toBeCloseTo(0, 6);
  });
  it('90° about Y maps a +Z-forward offset onto -X', () => {
    const m = mat4FromPosEuler([0, 1, 0], [0, 90, 0]);
    const p = applyMat4ToPoint(m, [0, 0, -0.5]);
    expect(p[0]).toBeCloseTo(-0.5, 6);
    expect(p[1]).toBeCloseTo(1, 6);
    expect(p[2]).toBeCloseTo(0, 6);
  });
});

describe('posEulerFromMat4 (round-trip inverse of mat4FromPosEuler)', () => {
  const cases: Array<[Vec3, Vec3]> = [
    [[0, 0, 0], [0, 0, 0]],
    [[1, 2, 3], [10, 20, 30]],
    [[-1, 0.5, 2], [0, 90, 0]], // gimbal lock
    [[0, 0, 0], [45, -30, 60]],
    [[5, -2, 1], [-80, 15, 170]],
    [[0, 0, 0], [0, 0, 90]],
    [[0, 0, 0], [90, 0, 0]],
    [[0, 0, 0], [0, -90, 0]], // gimbal lock
  ];
  for (const [pos, euler] of cases) {
    it(`rebuilds the matrix for pos=[${pos}] euler=[${euler}]`, () => {
      const M = mat4FromPosEuler(pos, euler);
      const { position, rotationDeg } = posEulerFromMat4(M);
      const M2 = mat4FromPosEuler(position, rotationDeg);
      M.forEach((v, i) => expect(M2[i]).toBeCloseTo(v, 9));
      position.forEach((v, i) => expect(v).toBeCloseTo(pos[i], 9));
    });
  }
});
