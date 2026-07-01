// Phase E2 (core): serialize/restore a planted anchor so reopening the app can
// resume the same alignment without re-scanning the QR. Pure JSON in/out with
// strict validation; the actual storage IO (AsyncStorage / file) is a thin
// device-side wrapper added once the base stack is device-verified.
import type { Vec3 } from './mat4';

export interface AnchorPose {
  position: Vec3;
  rotation: Vec3;
}

export interface AnchorState {
  version: 1;
  pose: AnchorPose;
  modelUri: string | null;
}

function isVec3(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function serializeAnchorState(s: AnchorState): string {
  return JSON.stringify(s);
}

/**
 * Parse + validate. Returns null on malformed JSON, wrong version, bad pose, or
 * bad modelUri — never throws, so a corrupt saved state degrades to "no restore".
 */
export function deserializeAnchorState(json: string): AnchorState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const pose = o.pose as Record<string, unknown> | undefined;
  if (!pose || !isVec3(pose.position) || !isVec3(pose.rotation)) return null;
  if (!(o.modelUri === null || typeof o.modelUri === 'string')) return null;
  return {
    version: 1,
    pose: { position: pose.position, rotation: pose.rotation },
    modelUri: o.modelUri,
  };
}
