// Phase E1: resolve which glTF a scene should load. A runtime URI (remote or
// on-device file) overrides the bundled fallback, so the app can overlay any
// project's model without a rebuild. Pure — the bundled fallback is passed in by
// the caller (a Metro `require(...)` handle) so this stays testable off-device.

/**
 * True when `uri` looks like something Viro can load as a remote/file model
 * source: an http(s) URL, or a file://‌/content:// path. Narrows to `string`.
 */
export function isLikelyModelUrl(uri: string | undefined | null): uri is string {
  if (!uri) return false;
  const u = uri.trim();
  return /^https?:\/\/.+/i.test(u) || u.startsWith('file://') || u.startsWith('content://');
}

/**
 * Return `{ uri }` when a usable model URI is supplied, otherwise the bundled
 * fallback (a `require(...)` handle). The generic keeps the fallback's type.
 */
export function resolveModelSource<T>(uri: string | undefined | null, fallback: T): { uri: string } | T {
  return isLikelyModelUrl(uri) ? { uri: uri.trim() } : fallback;
}
