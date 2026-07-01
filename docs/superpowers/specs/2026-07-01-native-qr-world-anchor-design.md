# Native QR World-Anchor Scene — Design

**Date:** 2026-07-01
**Repo:** `augusto-spati/spati-siteanchor` (native iOS/Android AR, Expo + ReactVision Viro)
**Status:** approved design → implementation

## Goal

Prove, on a real iPhone 14 Pro, that native ARKit can hold a BIM-style overlay
**anchored to the real world after a one-time QR bootstrap**, so the user can
**walk freely around an entire room** with the overlay staying put. This is the
de-risk test for the whole native pivot: it is both the fix for the translation
drift we hit on the web *and* the mechanism the real product will use.

## Background — why this scene, why native

The web SiteAnchor (8th Wall / AR.js, monocular) hit a hard ceiling: rotation
tracked fine but **translation drifted** ("sinal da cruz" test). Root cause is
inherent to single-camera marker-only tracking — AR.js is *marker-only*: the
moment the marker leaves the frame, the anchor is lost. There is no world
tracking.

Native ARKit on the 14 Pro gives real **6DOF world tracking + LiDAR**. The
correct model — and the one the user confirmed — is:

- The **QR is only a bootstrap**: seen once, it georeferences the scene (defines
  where the origin is and which way it faces).
- After that, **ARKit world tracking carries the anchored scene** as the user
  walks the room. The overlay lives in the *world*, not tied to the QR.
- Re-sighting the QR is an **optional drift reset**, not a requirement to keep
  the overlay visible.

Note (investigated 2026-07-01): the starter demo's "occlusion not supported"
report on the 14 Pro is a **Viro / New-Architecture wiring issue** (Viro's own
docs say iOS always supports depth occlusion; react-viro 2.56 *requires* Fabric
and its occlusion bridge under Fabric is incomplete), **not** a hardware limit.
It is irrelevant here: occlusion changes what is *drawn*, never how anything is
*anchored*. It is explicitly out of scope.

## Anchoring model (the heart)

```
ViroARImageMarker (target = QR PNG, physicalWidth = measured on the monitor)
   onAnchorFound(anchor)          ← fires once when the QR is first seen
      anchor.position / rotation  = pose of the QR in the ARKit WORLD frame
                │  (compute once)
                ▼
   T_world←model = T_world←QR ∘ (T_CRS←QR)⁻¹ ∘ modelToCrs
                │  (vendored helpers: invertRigidMat4, multiplyMat4)
                ▼
   store worldPose in React state → render the test object as a child of the
   SCENE (world frame), NOT a child of the marker
                │
                ▼
   <ViroNode position={worldPos} rotation={worldRot}>  cube + XYZ axes  </ViroNode>
      └─ persists while the user walks; ARKit world tracking carries it
```

**Design decisions:**

1. **Decoupled from the marker.** The object is a child of `ViroARScene` (world
   frame), never of `ViroARImageMarker`. That is what lets the user walk away
   from the QR without the object disappearing — the marker is only the trigger
   that delivers the initial pose.
2. **Optional reset.** On later detections (`onAnchorUpdated`, QR re-sighted),
   recompute and re-plant → resets accumulated drift. If the QR is never seen
   again, world tracking still carries the scene.
3. **Persistence backing.** For validation a `ViroNode` positioned in the world
   suffices (world tracking carries it). If it drifts more than acceptable in
   practice, the follow-up is to create a real ARKit *world anchor* at the same
   point (more stable). Deferred — not built now.

## Frame conventions & math

Frames:
- **CRS** — survey frame, Z-up, meters (UTM easting=X, northing=Y, height=Z).
- **model / glTF** — Y-up (Three.js/Viro render convention). `modelToCrs`
  (the `Georef` matrix) maps model-local → CRS.
- **world (W)** — ARKit/Viro tracking frame, Y-up, meters.

Given from Viro at detection: `T_world←QR` (built from `anchor.position` +
`anchor.rotation`). Known from data: `T_CRS←QR` (marker's surveyed pose) and
`modelToCrs`. Compute:

```
T_marker←model = invertRigidMat4(T_CRS←QR) ∘ modelToCrs
T_world←model  = T_world←QR ∘ T_marker←model
```

All matrices are column-major length-16 (glTF convention), matching
`@spati/coordinates-contract`.

**Validation simplification (this scene only):** `T_CRS←QR = identity` and
`modelToCrs` is a **translation-only** offset (a 0.30 m cube ~0.50 m in front of
the QR, no rotation). With those data the math degenerates to
`worldRot = QR rotation` and `worldPos = QR position + R(QR rotation)·offset` —
so there is **no Euler-order hazard** on screen. The general rotation-carrying
path still lives in `worldAnchor.ts` and is exercised by the unit test, ready
for the real-survey phase; it is just not hit by the validation data.

## Components / file structure (native repo)

```
components/ar-scenes/WorldAnchorScene.tsx  NEW — ViroARScene + ViroARImageMarker + world-frame ViroNode
app/index.tsx                              EDIT — launch WorldAnchorScene directly; remove occlusion probe + menu
assets/markers/qr.png                      NEW — QR PNG (Viro tracking target + the image shown on the monitor)
src/spati-anchor/
  mat4.ts            NEW (vendored) — multiplyMat4, invertRigidMat4, rigidMat4, identityMat4, applyMat4ToPoint, Mat4, Vec3
  markerMap.ts       NEW (vendored) — MarkerEntry, MarkerMap, lookupMarker
  viroBridge.ts      NEW — mat4FromPosEuler / posEulerFromMat4 (Viro's rotation convention: [x,y,z] Euler degrees)
  worldAnchor.ts     NEW — worldFromDetection(tWorldMarker, tCrsMarker, modelToCrs): Mat4
  fixtures.ts        NEW — fabricated validation data: T_CRS←QR = identity, cube offset georef, physicalWidth
  worldAnchor.test.ts NEW — offline unit test of the math (jest-expo)
```

### Vendored code (monorepo → native repo)

The subtle matrix + marker types live in the private `spati` monorepo
(`@spati/coordinates-contract`, `apps/siteanchor/src/ar/markerMap.ts`). The
native repo is public; rather than publish an npm package now (YAGNI), we
**vendor ~120 lines** of pure, dependency-free TS into `src/spati-anchor/`.

- Every vendored file carries a provenance header:
  `// Vendored from spati monorepo @spati/coordinates-contract@1.0.0 — keep in sync; do not diverge silently.`
- A **wire-format pin test** asserts fixed numeric input→output vectors for the
  vendored matrix ops (same cross-stack pattern the Revit plugin uses), so any
  accidental edit to the copy is caught.
- The heavy `@spati/geo` solver (Umeyama/SVD/UTM) is **not** vendored — it is
  offline registration, never used at runtime.

### Key signatures

```ts
// src/spati-anchor/worldAnchor.ts
export function worldFromDetection(
  tWorldMarker: Mat4,   // from Viro detection
  tCrsMarker: Mat4,     // known marker pose in CRS (identity for validation)
  modelToCrs: Mat4,     // georef (translation-only offset for validation)
): Mat4;                // T_world←model

// src/spati-anchor/viroBridge.ts
export function mat4FromPosEuler(position: Vec3, rotationDeg: Vec3): Mat4;
export function posEulerFromMat4(m: Mat4): { position: Vec3; rotationDeg: Vec3 };
```

## UX states (full-screen standalone app)

- **Searching** — before first detection: overlay hint "Aponte para o QR".
- **Anchored** — after detection: cube + XYZ axes appear; discreet "Ancorado ✓" badge.
- **Tracking limited** — via `ViroARScene.onTrackingUpdated`, show a pt-BR hint
  (low texture → "aponte para uma área com mais detalhe"; fast motion → "mova
  mais devagar"). Reuses the web `trackHint` mapping. Useful during the walk test.
- **Re-plant button** — clears and re-detects, so the walk test can be repeated.

## Physical marker

The QR is displayed **on the PC monitor** (print is the fallback if screen glare
makes tracking jittery). Because on-screen physical size depends on the display,
the user **measures the on-screen QR with a ruler** and sets a single constant
`QR_PHYSICAL_WIDTH_M` so ARKit gets correct metric scale. The QR's encoded
content is irrelevant (we do not decode it) — it is a feature-rich trackable
pattern; approach (i) from brainstorming: QR-as-image-target, one registered
marker.

## Testing

- **Offline (jest-expo, Expo default):** `worldAnchor.test.ts` runs the general
  rotation-carrying path with a scripted detection pose and asserts the expected
  world pose (mirrors the monorepo `MockMarkerSource` / `anchorScenario.test`
  pattern). Plus the vendored-math pin test. Runs in CI with no device.
- **On-device (manual):** the 4-step checklist in the README —
  (1) point at QR → cube appears; (2) walk away, around the room → cube stays;
  (3) return, re-sight QR → drift resets; (4) tracking hints behave.

## Non-goals (YAGNI)

- Real BIM `.glb`, real survey coordinates, `georef.json` from the pipeline.
- Multiple markers; decoding the QR payload (approach (ii)) — the `MarkerSource`
  seam already supports adding these later without touching the anchor.
- LiDAR occlusion (Viro/Fabric issue, and orthogonal to anchoring).
- Hot-reload dev-client build (separate follow-up).

## Open items / future

- General Euler-order path: `viroBridge` must match Viro's exact rotation order;
  the round-trip unit test pins it before real rotated data is used.
- Real ARKit world anchor (vs plain world-positioned node) if drift over a large
  room proves too high.
- Graduate vendored math to a published `@spati/coordinates-contract` package if
  divergence becomes a real problem.
