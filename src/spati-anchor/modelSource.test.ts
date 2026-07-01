import { describe, it, expect } from 'vitest';
import { isLikelyModelUrl, resolveModelSource } from './modelSource';

describe('isLikelyModelUrl', () => {
  it('accepts http(s), file, and content URIs', () => {
    expect(isLikelyModelUrl('https://cdn.example.com/room.glb')).toBe(true);
    expect(isLikelyModelUrl('http://x/y.glb')).toBe(true);
    expect(isLikelyModelUrl('file:///var/mobile/room.glb')).toBe(true);
    expect(isLikelyModelUrl('content://media/123')).toBe(true);
    expect(isLikelyModelUrl('  https://x/y.glb  ')).toBe(true); // trims
  });
  it('rejects empty, nullish, and non-URI strings', () => {
    expect(isLikelyModelUrl(undefined)).toBe(false);
    expect(isLikelyModelUrl(null)).toBe(false);
    expect(isLikelyModelUrl('')).toBe(false);
    expect(isLikelyModelUrl('   ')).toBe(false);
    expect(isLikelyModelUrl('room.glb')).toBe(false);
    expect(isLikelyModelUrl('ftp://x/y.glb')).toBe(false);
  });
});

describe('resolveModelSource', () => {
  const BUNDLED = 42; // stand-in for a Metro require(...) handle (a number at runtime)
  it('returns {uri} for a valid URI', () => {
    expect(resolveModelSource('https://x/y.glb', BUNDLED)).toEqual({ uri: 'https://x/y.glb' });
  });
  it('trims the uri', () => {
    expect(resolveModelSource('  file:///a.glb ', BUNDLED)).toEqual({ uri: 'file:///a.glb' });
  });
  it('falls back to the bundled handle when no usable URI', () => {
    expect(resolveModelSource(undefined, BUNDLED)).toBe(BUNDLED);
    expect(resolveModelSource('', BUNDLED)).toBe(BUNDLED);
    expect(resolveModelSource('not-a-url', BUNDLED)).toBe(BUNDLED);
  });
});
