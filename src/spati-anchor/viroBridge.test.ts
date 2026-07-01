import { describe, it, expect } from 'vitest';
import { mat4FromPosEuler } from './viroBridge';
import { applyMat4ToPoint, translationMat4 } from './mat4';

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
