import { describe, it, expect } from 'vitest';
import { worldFromDetection, cubeWorldPose } from './worldAnchor';
import { identityMat4, translationMat4 } from './mat4';

describe('worldFromDetection (general path)', () => {
  it('identity marker + translation georef → world = marker∘offset', () => {
    const tWorldMarker = translationMat4([0, 1, 0]);
    const result = worldFromDetection(tWorldMarker, identityMat4(), translationMat4([0, 0, -0.5]));
    translationMat4([0, 1, -0.5]).forEach((v, i) => expect(result[i]).toBeCloseTo(v, 12));
  });
});

describe('cubeWorldPose (validation render helper)', () => {
  it('unrotated anchor: offset adds to position, rotation passes through', () => {
    const r = cubeWorldPose({ position: [0, 1, 0], rotation: [0, 0, 0] }, [0, 0, -0.5]);
    expect(r.position[0]).toBeCloseTo(0, 6);
    expect(r.position[1]).toBeCloseTo(1, 6);
    expect(r.position[2]).toBeCloseTo(-0.5, 6);
    expect(r.rotation).toEqual([0, 0, 0]);
  });
  it('yaw 90° about Y rotates the offset into world', () => {
    const r = cubeWorldPose({ position: [0, 1, 0], rotation: [0, 90, 0] }, [0, 0, -0.5]);
    expect(r.position[0]).toBeCloseTo(-0.5, 6);
    expect(r.position[1]).toBeCloseTo(1, 6);
    expect(r.position[2]).toBeCloseTo(0, 6);
    expect(r.rotation).toEqual([0, 90, 0]);
  });
});
