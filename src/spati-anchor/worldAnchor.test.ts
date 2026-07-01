import { describe, it, expect } from 'vitest';
import { worldFromDetection, cubeWorldPose, modelWorldPose } from './worldAnchor';
import { identityMat4, translationMat4, type Vec3 } from './mat4';
import { mat4FromPosEuler } from './viroBridge';

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

describe('modelWorldPose (Phase A — full model placement)', () => {
  it('identity QR-in-model → model pose equals the anchor pose', () => {
    const anchor = { position: [1, 2, 3] as Vec3, rotation: [0, 45, 0] as Vec3 };
    const r = modelWorldPose(anchor, identityMat4());
    const M = mat4FromPosEuler(r.position, r.rotationDeg);
    const A = mat4FromPosEuler(anchor.position, anchor.rotation);
    A.forEach((v, i) => expect(M[i]).toBeCloseTo(v, 9));
  });
  it('offsets the model origin by the inverse of the QR position in the model', () => {
    // QR sits 2m along +Z in the model, no rotation; detected at world origin.
    const anchor = { position: [0, 0, 0] as Vec3, rotation: [0, 0, 0] as Vec3 };
    const r = modelWorldPose(anchor, translationMat4([0, 0, 2]));
    expect(r.position[0]).toBeCloseTo(0, 9);
    expect(r.position[1]).toBeCloseTo(0, 9);
    expect(r.position[2]).toBeCloseTo(-2, 9);
  });
});
