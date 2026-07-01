// Vendored from spati monorepo @spati/coordinates-contract@1.0.0 — keep in sync; do not diverge silently.
import type { Mat4 } from './mat4';

export interface MarkerEntry {
  /** Marker id. */
  id: number;
  /** Printed marker edge length in meters (metric scale). */
  sizeMeters: number;
  /** Known pose of the marker in project CRS (column-major rigid). */
  tCrsMarker: Mat4;
}

export interface MarkerMap {
  markers: MarkerEntry[];
}

/** Resolve a detected marker id to its surveyed CRS pose, or null if unknown. */
export function lookupMarker(map: MarkerMap, id: number): MarkerEntry | null {
  return map.markers.find((m) => m.id === id) ?? null;
}
