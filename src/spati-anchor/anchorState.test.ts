import { describe, it, expect } from 'vitest';
import { serializeAnchorState, deserializeAnchorState, type AnchorState } from './anchorState';

const sample: AnchorState = {
  version: 1,
  pose: { position: [1, 2, 3], rotation: [0, 45, 0] },
  modelUri: 'https://x/y.glb',
};

describe('anchorState round-trip', () => {
  it('serialize → deserialize preserves the state', () => {
    expect(deserializeAnchorState(serializeAnchorState(sample))).toEqual(sample);
  });
  it('preserves a null modelUri', () => {
    const s = { ...sample, modelUri: null };
    expect(deserializeAnchorState(serializeAnchorState(s))).toEqual(s);
  });
});

describe('deserializeAnchorState rejects bad input (returns null, never throws)', () => {
  it('malformed JSON', () => {
    expect(deserializeAnchorState('{not json')).toBeNull();
  });
  it('wrong version', () => {
    expect(deserializeAnchorState(JSON.stringify({ ...sample, version: 2 }))).toBeNull();
  });
  it('missing pose', () => {
    expect(deserializeAnchorState(JSON.stringify({ version: 1, modelUri: null }))).toBeNull();
  });
  it('pose with wrong-length vector', () => {
    const bad = { version: 1, pose: { position: [1, 2], rotation: [0, 0, 0] }, modelUri: null };
    expect(deserializeAnchorState(JSON.stringify(bad))).toBeNull();
  });
  it('pose with non-finite number', () => {
    const bad = { version: 1, pose: { position: [1, 2, null], rotation: [0, 0, 0] }, modelUri: null };
    expect(deserializeAnchorState(JSON.stringify(bad))).toBeNull();
  });
  it('modelUri of wrong type', () => {
    const bad = { ...sample, modelUri: 5 };
    expect(deserializeAnchorState(JSON.stringify(bad))).toBeNull();
  });
});
