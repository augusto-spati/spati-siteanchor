# Native QR World-Anchor Scene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove on an iPhone 14 Pro that a QR bootstraps a one-time georeference and the overlay then lives in the ARKit **world** frame, so you can walk a whole room away from the QR and it stays anchored.

**Architecture:** Pure-TS matrix math (vendored from the spati monorepo `@spati/coordinates-contract`) computes the cube's world pose from a single `ViroARImageMarker` detection. The cube is rendered as a child of `ViroARScene` (world frame), NOT of the marker, so ARKit world-tracking carries it. Re-sighting the QR (`onAnchorUpdated`) re-plants → resets drift.

**Tech Stack:** Expo 55, ReactVision Viro 2.56 (Fabric/New-Arch), React Native 0.83, TypeScript. Offline math tests via **vitest** (pure TS, no RN). QR asset generated via a committed Node script (`qrcode`).

## Global Constraints

- Repo: `C:\Users\aschi\source\spati-siteanchor`, branch `feat/qr-world-anchor` (already created).
- Matrices are **column-major, flat length-16** (glTF convention), matching `@spati/coordinates-contract@1.0.0`.
- Every vendored file starts with: `// Vendored from spati monorepo @spati/coordinates-contract@1.0.0 — keep in sync; do not diverge silently.`
- The cube is a child of `ViroARScene` (world frame), **never** a child of `ViroARImageMarker`.
- Do NOT vendor `@spati/geo` (offline solver, unused at runtime). Do NOT build the Euler **decompose** (`posEulerFromMat4`) — unused until real rotated survey data (YAGNI); only the **compose** direction (`mat4FromPosEuler`) is needed now.
- pt-BR for on-screen strings, English for code/comments.
- Do NOT commit `_ipa/`, `package-lock.json`. The repo uses **yarn**; commit `yarn.lock` changes.
- Viro anchor payload: `{ position:[x,y,z], rotation:[x,y,z] (degrees), type:'image', ... }`. Tracking: `onTrackingUpdated(state, reason)`; `ViroTrackingStateConstants.TRACKING_NORMAL=3, TRACKING_LIMITED=2, TRACKING_UNAVAILABLE=1`; `ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION=2, TRACKING_REASON_INSUFFICIENT_FEATURES=3`.

---

## File structure

```
src/spati-anchor/
  mat4.ts             pure matrix core (vendored)          — Task 1
  mat4.test.ts        pin-vector tests                     — Task 1
  viroBridge.ts       mat4FromPosEuler (compose only)      — Task 2
  viroBridge.test.ts                                       — Task 2
  worldAnchor.ts      worldFromDetection + cubeWorldPose   — Task 3
  markerMap.ts        MarkerEntry/MarkerMap (vendored)     — Task 3
  fixtures.ts         QR_PHYSICAL_WIDTH_M, CUBE_OFFSET_M   — Task 3
  worldAnchor.test.ts                                      — Task 3
scripts/make-qr.js    generates assets/markers/qr.png      — Task 4
assets/markers/qr.png the QR (tracking target + on-screen) — Task 4
components/ar-scenes/WorldAnchorScene.tsx  the Viro scene  — Task 5
app/index.tsx         launch WorldAnchorScene (rewrite)    — Task 5
README.md             on-device walk-test checklist        — Task 6
```

---

### Task 1: Vendored matrix core + vitest

**Files:**
- Create: `src/spati-anchor/mat4.ts`
- Create: `src/spati-anchor/mat4.test.ts`
- Modify: `package.json` (add `vitest` devDep + `test` script)

**Interfaces:**
- Produces: `Vec3 = [number,number,number]`; `Mat4 = number[]` (col-major, len 16); `identityMat4()`, `translationMat4(t:Vec3)`, `multiplyMat4(a,b)` (returns a∘b), `applyMat4ToPoint(m,p)`, `rigidMat4(rotRowMajor:number[][], t:Vec3)`, `invertRigidMat4(m)`.

- [ ] **Step 1: Add vitest + test script**

```bash
cd C:/Users/aschi/source/spati-siteanchor
yarn add -D vitest
```
Then edit `package.json` `"scripts"` to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing test**

Create `src/spati-anchor/mat4.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  identityMat4, translationMat4, multiplyMat4, applyMat4ToPoint,
  rigidMat4, invertRigidMat4, type Mat4,
} from './mat4';

// Rz(90°) + translation [1,2,3], column-major.
const M: Mat4 = [0,1,0,0, -1,0,0,0, 0,0,1,0, 1,2,3,1];

describe('mat4', () => {
  it('multiply by identity is a no-op', () => {
    expect(multiplyMat4(M, identityMat4())).toEqual(M);
  });
  it('applies a rigid transform to a point', () => {
    // rotate [1,0,0] by 90° about Z -> [0,1,0], then + [1,2,3]
    expect(applyMat4ToPoint(M, [1, 0, 0])).toEqual([1, 3, 3]);
  });
  it('inverts a rigid transform (pin vector)', () => {
    expect(invertRigidMat4(M)).toEqual([0,-1,0,0, 1,0,0,0, 0,0,1,0, -2,1,-3,1]);
  });
  it('M ∘ M⁻¹ = identity', () => {
    const r = multiplyMat4(M, invertRigidMat4(M));
    r.forEach((v, i) => expect(v).toBeCloseTo(identityMat4()[i], 12));
  });
  it('translationMat4 builds the expected column-major matrix', () => {
    expect(translationMat4([1, 2, 3])).toEqual([1,0,0,0, 0,1,0,0, 0,0,1,0, 1,2,3,1]);
  });
  it('rigidMat4 places rotation columns + translation', () => {
    expect(rigidMat4([[0,-1,0],[1,0,0],[0,0,1]], [1,2,3])).toEqual(M);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL — `Cannot find module './mat4'`.

- [ ] **Step 4: Write the implementation**

Create `src/spati-anchor/mat4.ts`:
```ts
// Vendored from spati monorepo @spati/coordinates-contract@1.0.0 — keep in sync; do not diverge silently.
export type Vec3 = [number, number, number];
/** Column-major 4x4 as a flat length-16 array (glTF convention). */
export type Mat4 = number[];

export function identityMat4(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

export function translationMat4(t: Vec3): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1];
}

/** Multiply two column-major 4x4 matrices: returns a ∘ b. */
export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = s;
    }
  }
  return out;
}

/** Apply a column-major 4x4 affine to a 3D point (implicit w = 1). */
export function applyMat4ToPoint(m: Mat4, p: Vec3): Vec3 {
  const [x, y, z] = p;
  const tx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const ty = m[1] * x + m[5] * y + m[9] * z + m[13];
  const tz = m[2] * x + m[6] * y + m[10] * z + m[14];
  const tw = m[3] * x + m[7] * y + m[11] * z + m[15];
  return tw !== 0 && tw !== 1 ? [tx / tw, ty / tw, tz / tw] : [tx, ty, tz];
}

/** Build a column-major rigid 4x4 from a 3x3 rotation (row-major nested) + translation. */
export function rigidMat4(rotationRowMajor: number[][], translation: Vec3): Mat4 {
  const r = rotationRowMajor;
  return [
    r[0][0], r[1][0], r[2][0], 0,
    r[0][1], r[1][1], r[2][1], 0,
    r[0][2], r[1][2], r[2][2], 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

/** Inverse of a RIGID column-major 4x4: M = [R|t] → M⁻¹ = [Rᵀ | −Rᵀt]. */
export function invertRigidMat4(m: Mat4): Mat4 {
  const rt: number[][] = [
    [m[0], m[1], m[2]],
    [m[4], m[5], m[6]],
    [m[8], m[9], m[10]],
  ];
  const t: Vec3 = [m[12], m[13], m[14]];
  const nt: Vec3 = [
    -(rt[0][0] * t[0] + rt[0][1] * t[1] + rt[0][2] * t[2]),
    -(rt[1][0] * t[0] + rt[1][1] * t[1] + rt[1][2] * t[2]),
    -(rt[2][0] * t[0] + rt[2][1] * t[1] + rt[2][2] * t[2]),
  ];
  return rigidMat4(rt, nt);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn test`
Expected: PASS (6 passing).

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/spati-anchor/mat4.ts src/spati-anchor/mat4.test.ts
git commit -m "feat(anchor): vendored column-major matrix core + vitest pin tests"
```

---

### Task 2: Euler → matrix bridge (compose only)

**Files:**
- Create: `src/spati-anchor/viroBridge.ts`
- Create: `src/spati-anchor/viroBridge.test.ts`

**Interfaces:**
- Consumes: `Mat4`, `Vec3`, `multiplyMat4`, `rigidMat4`, `applyMat4ToPoint` from `./mat4`.
- Produces: `mat4FromPosEuler(position: Vec3, rotationDeg: Vec3): Mat4` — builds `T = translate(position) ∘ Rz(z)∘Ry(y)∘Rx(x)` where rotations are the Viro anchor's Euler degrees. (Compose direction only; the inverse decompose is deferred — see Global Constraints.)

- [ ] **Step 1: Write the failing test**

Create `src/spati-anchor/viroBridge.test.ts`:
```ts
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
  it('90° about Y maps +Z-forward offset onto -X', () => {
    const m = mat4FromPosEuler([0, 1, 0], [0, 90, 0]);
    const p = applyMat4ToPoint(m, [0, 0, -0.5]);
    expect(p[0]).toBeCloseTo(-0.5, 6);
    expect(p[1]).toBeCloseTo(1, 6);
    expect(p[2]).toBeCloseTo(0, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test viroBridge`
Expected: FAIL — `Cannot find module './viroBridge'`.

- [ ] **Step 3: Write the implementation**

Create `src/spati-anchor/viroBridge.ts`:
```ts
// Bridges Viro's per-anchor pose (position + Euler degrees) into a column-major
// Mat4. Compose direction only — the inverse decompose is added when real rotated
// survey data needs it (validation data is translation-only). Rotation order:
// R = Rz ∘ Ry ∘ Rx (apply X, then Y, then Z), matching three.js-derived Viro.
import { type Mat4, type Vec3, multiplyMat4, rigidMat4 } from './mat4';

const d2r = (deg: number): number => (deg * Math.PI) / 180;

function rotX(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[1, 0, 0], [0, c, -s], [0, s, c]], [0, 0, 0]);
}
function rotY(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[c, 0, s], [0, 1, 0], [-s, 0, c]], [0, 0, 0]);
}
function rotZ(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return rigidMat4([[c, -s, 0], [s, c, 0], [0, 0, 1]], [0, 0, 0]);
}

export function mat4FromPosEuler(position: Vec3, rotationDeg: Vec3): Mat4 {
  const R = multiplyMat4(
    rotZ(d2r(rotationDeg[2])),
    multiplyMat4(rotY(d2r(rotationDeg[1])), rotX(d2r(rotationDeg[0]))),
  );
  R[12] = position[0];
  R[13] = position[1];
  R[14] = position[2];
  return R;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test viroBridge`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add src/spati-anchor/viroBridge.ts src/spati-anchor/viroBridge.test.ts
git commit -m "feat(anchor): Viro Euler→Mat4 compose bridge"
```

---

### Task 3: World-anchor math + marker map + fixtures

**Files:**
- Create: `src/spati-anchor/worldAnchor.ts`
- Create: `src/spati-anchor/markerMap.ts`
- Create: `src/spati-anchor/fixtures.ts`
- Create: `src/spati-anchor/worldAnchor.test.ts`

**Interfaces:**
- Consumes: `Mat4, Vec3, multiplyMat4, invertRigidMat4, applyMat4ToPoint` from `./mat4`; `mat4FromPosEuler` from `./viroBridge`.
- Produces:
  - `worldFromDetection(tWorldMarker: Mat4, tCrsMarker: Mat4, modelToCrs: Mat4): Mat4` — general path `T_world←model = T_world←marker ∘ (T_CRS←marker)⁻¹ ∘ modelToCrs`.
  - `cubeWorldPose(anchor: {position: Vec3; rotation: Vec3}, offsetInMarker: Vec3): {position: Vec3; rotation: Vec3}` — validation render helper (identity marker, translation-only offset): rotates the offset into world and passes the anchor's rotation straight through.
  - `markerMap.ts`: `MarkerEntry {id:number; sizeMeters:number; tCrsMarker:Mat4}`, `MarkerMap {markers:MarkerEntry[]}`, `lookupMarker(map,id)`.
  - `fixtures.ts`: `QR_PHYSICAL_WIDTH_M: number`, `CUBE_OFFSET_M: Vec3`.

- [ ] **Step 1: Write the failing test**

Create `src/spati-anchor/worldAnchor.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test worldAnchor`
Expected: FAIL — `Cannot find module './worldAnchor'`.

- [ ] **Step 3: Write the implementations**

Create `src/spati-anchor/worldAnchor.ts`:
```ts
import { type Mat4, type Vec3, multiplyMat4, invertRigidMat4, applyMat4ToPoint } from './mat4';
import { mat4FromPosEuler } from './viroBridge';

/**
 * General anchoring: compose the model's world pose from a live marker detection
 * and the marker's known CRS pose + the model georef.
 *   T_world←model = T_world←marker ∘ (T_CRS←marker)⁻¹ ∘ modelToCrs
 */
export function worldFromDetection(tWorldMarker: Mat4, tCrsMarker: Mat4, modelToCrs: Mat4): Mat4 {
  return multiplyMat4(tWorldMarker, multiplyMat4(invertRigidMat4(tCrsMarker), modelToCrs));
}

/**
 * Validation render helper. With T_CRS←marker = identity and a translation-only
 * georef offset, the model's world position is the offset rotated by the marker's
 * orientation and translated to the marker's world position; its orientation is the
 * marker's orientation. Avoids any Euler decompose (offset carries no rotation).
 */
export function cubeWorldPose(
  anchor: { position: Vec3; rotation: Vec3 },
  offsetInMarker: Vec3,
): { position: Vec3; rotation: Vec3 } {
  const tWorldMarker = mat4FromPosEuler(anchor.position, anchor.rotation);
  return { position: applyMat4ToPoint(tWorldMarker, offsetInMarker), rotation: anchor.rotation };
}
```

Create `src/spati-anchor/markerMap.ts`:
```ts
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
```

Create `src/spati-anchor/fixtures.ts`:
```ts
import type { Vec3 } from './mat4';

/**
 * Physical width of the QR AS DISPLAYED, in meters. The QR is shown on the PC
 * monitor for validation; measure it on-screen with a ruler and set this value.
 * Default 0.15 = 15 cm. Wrong value → wrong metric scale → depth is off.
 */
export const QR_PHYSICAL_WIDTH_M = 0.15;

/**
 * Where the test cube sits relative to the QR, in the marker's local frame (m).
 * Validation only. Tweak the axis/sign on-device so the cube sits nicely near
 * the marker rather than inside it.
 */
export const CUBE_OFFSET_M: Vec3 = [0, 0, -0.5];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS (all suites: mat4 + viroBridge + worldAnchor).

- [ ] **Step 5: Commit**

```bash
git add src/spati-anchor/worldAnchor.ts src/spati-anchor/markerMap.ts src/spati-anchor/fixtures.ts src/spati-anchor/worldAnchor.test.ts
git commit -m "feat(anchor): world-from-detection math + marker map + validation fixtures"
```

---

### Task 4: QR asset

**Files:**
- Create: `scripts/make-qr.js`
- Create: `assets/markers/qr.png`
- Modify: `package.json` (add `qrcode` devDep)

- [ ] **Step 1: Add the generator dep + script**

```bash
cd C:/Users/aschi/source/spati-siteanchor
yarn add -D qrcode
```
Create `scripts/make-qr.js`:
```js
// Generates the QR image used both as the Viro tracking target and as the
// on-screen marker. The encoded content is irrelevant (we never decode it) — a
// QR just makes a high-contrast, feature-rich, asymmetric tracking pattern.
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const out = path.join(__dirname, '..', 'assets', 'markers', 'qr.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

QRCode.toFile(
  out,
  'spati-siteanchor:marker:1',
  { width: 1024, margin: 4, errorCorrectionLevel: 'H', color: { dark: '#000000', light: '#FFFFFF' } },
  (err) => {
    if (err) throw err;
    console.log('Wrote', out);
  },
);
```

- [ ] **Step 2: Generate the asset**

Run: `node scripts/make-qr.js`
Expected: `Wrote .../assets/markers/qr.png`.

- [ ] **Step 3: Verify it is a valid 1024px PNG**

Run: `node -e "const s=require('fs').statSync('assets/markers/qr.png');const b=require('fs').readFileSync('assets/markers/qr.png');console.log('bytes',s.size,'png',b.slice(1,4).toString()==='PNG')"`
Expected: `bytes <n> png true`.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock scripts/make-qr.js assets/markers/qr.png
git commit -m "feat(anchor): generate QR tracking-target asset"
```

---

### Task 5: WorldAnchorScene + wire the app entry

**Files:**
- Create: `components/ar-scenes/WorldAnchorScene.tsx`
- Modify: `app/index.tsx` (replace the demo menu + occlusion probe)

**Interfaces:**
- Consumes: `cubeWorldPose` from `../../src/spati-anchor/worldAnchor`; `CUBE_OFFSET_M, QR_PHYSICAL_WIDTH_M` from `../../src/spati-anchor/fixtures`; `Vec3` from `../../src/spati-anchor/mat4`.

- [ ] **Step 1: Write the scene**

Create `components/ar-scenes/WorldAnchorScene.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  ViroNode,
  ViroBox,
  ViroText,
  ViroAmbientLight,
  ViroMaterials,
  ViroTrackingStateConstants,
  ViroARTrackingReasonConstants,
} from '@reactvision/react-viro';
import { cubeWorldPose } from '../../src/spati-anchor/worldAnchor';
import { CUBE_OFFSET_M, QR_PHYSICAL_WIDTH_M } from '../../src/spati-anchor/fixtures';
import type { Vec3 } from '../../src/spati-anchor/mat4';

// The QR is registered as a tracked image. Its encoded content is never decoded.
ViroARTrackingTargets.createTargets({
  qr: {
    source: require('../../assets/markers/qr.png'),
    orientation: 'Up',
    physicalWidth: QR_PHYSICAL_WIDTH_M,
    type: 'Image',
  },
});

ViroMaterials.createMaterials({
  cube: { diffuseColor: '#4C6FFF' },
  axisX: { diffuseColor: '#FF3B30' },
  axisY: { diffuseColor: '#34C759' },
  axisZ: { diffuseColor: '#0A84FF' },
});

type Pose = { position: Vec3; rotation: Vec3 };

function trackHint(state: number, reason: number): string | null {
  if (state === ViroTrackingStateConstants.TRACKING_NORMAL) return null;
  if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION) return 'Mova mais devagar';
  if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_INSUFFICIENT_FEATURES)
    return 'Aponte para uma área com mais detalhe';
  return 'Inicializando o rastreamento…';
}

export default function WorldAnchorScene() {
  const [pose, setPose] = useState<Pose | null>(null);
  const [hint, setHint] = useState<string | null>('Aponte a câmera para o QR');

  // Re-plants on every update while the QR is visible (drift reset). When the QR
  // leaves view there are no more updates, so the pose freezes in the world frame
  // and ARKit world-tracking carries it as you walk the room.
  const onAnchor = (anchor: { position: Vec3; rotation: Vec3 }) => {
    setPose(cubeWorldPose({ position: anchor.position, rotation: anchor.rotation }, CUBE_OFFSET_M));
  };

  return (
    <ViroARScene
      onTrackingUpdated={(state: number, reason: number) => {
        const h = trackHint(state, reason);
        setHint(pose ? h : h ?? 'Aponte a câmera para o QR');
      }}
    >
      <ViroAmbientLight color="#ffffff" intensity={250} />

      {/* Trigger only — intentionally has no visible children. */}
      <ViroARImageMarker target="qr" onAnchorFound={onAnchor} onAnchorUpdated={onAnchor} />

      {pose && (
        <ViroNode position={pose.position} rotation={pose.rotation}>
          <ViroBox scale={[0.3, 0.3, 0.3]} materials={['cube']} />
          <ViroBox position={[0.25, 0, 0]} scale={[0.5, 0.02, 0.02]} materials={['axisX']} />
          <ViroBox position={[0, 0.25, 0]} scale={[0.02, 0.5, 0.02]} materials={['axisY']} />
          <ViroBox position={[0, 0, 0.25]} scale={[0.02, 0.02, 0.5]} materials={['axisZ']} />
        </ViroNode>
      )}

      {pose && <ViroText text="Ancorado" position={[0, 0.35, -1.5]} scale={[0.4, 0.4, 0.4]} style={styles.badge} />}
      {hint && <ViroText text={hint} position={[0, 0, -1.5]} scale={[0.5, 0.5, 0.5]} style={styles.hint} />}
      {pose && (
        <ViroText
          text="Re-plantar"
          position={[0, -0.4, -1.5]}
          scale={[0.4, 0.4, 0.4]}
          style={styles.button}
          onClick={() => setPose(null)}
        />
      )}
    </ViroARScene>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: 'Arial', fontSize: 26, color: '#ffffff', textAlign: 'center', textAlignVertical: 'center' },
  badge: { fontFamily: 'Arial', fontSize: 22, color: '#34C759', textAlign: 'center', textAlignVertical: 'center' },
  button: { fontFamily: 'Arial', fontSize: 24, color: '#4C6FFF', textAlign: 'center', textAlignVertical: 'center' },
});
```

- [ ] **Step 2: Rewrite the app entry**

Replace the entire contents of `app/index.tsx` with:
```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import WorldAnchorScene from '@/components/ar-scenes/WorldAnchorScene';

export default function ARHome() {
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator initialScene={{ scene: WorldAnchorScene }} style={styles.nav} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: { flex: 1 },
});
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` then `yarn lint`
Expected: no errors from the new files. (If `@reactvision/react-viro` types miss a named export you used, fix the import — do NOT `@ts-ignore` silently.)

- [ ] **Step 4: Verify the offline suite still passes**

Run: `yarn test`
Expected: PASS (unchanged — the scene is not unit-tested; its verification is on-device in Task 6).

- [ ] **Step 5: Commit**

```bash
git add components/ar-scenes/WorldAnchorScene.tsx app/index.tsx
git commit -m "feat(anchor): WorldAnchorScene — QR bootstrap, world-frame cube, tracking hints"
```

---

### Task 6: On-device checklist + CI build

**Files:**
- Modify: `README.md` (add the walk-test section)

- [ ] **Step 1: Add the walk-test checklist to README**

Append to `README.md`:
```markdown
## QR world-anchor validation (walk-the-room test)

1. On the PC, open `assets/markers/qr.png` and display it large. **Measure the
   on-screen QR width with a ruler.** If it is not ~15 cm, set the measured value
   (in meters) in `src/spati-anchor/fixtures.ts` → `QR_PHYSICAL_WIDTH_M` and
   rebuild.
2. Launch **Spati SiteAnchor** on the iPhone 14 Pro. Point at the QR.
3. A blue cube with XYZ axes appears near the QR ("Ancorado" shows).
4. **Put the phone down-ish and walk around the whole room.** The cube must stay
   put in the world — it does NOT need the QR in view.
5. Return and re-sight the QR → it re-plants (drift reset). "Re-plantar" clears
   it so you can repeat.
6. Tracking hints ("Mova mais devagar" / "Aponte para uma área com mais detalhe")
   show when ARKit tracking degrades.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(anchor): walk-the-room on-device validation checklist"
```

- [ ] **Step 3: Push + trigger the unsigned-IPA CI**

```bash
git push -u origin feat/qr-world-anchor
gh workflow run "iOS unsigned IPA (Sideloadly)" --ref feat/qr-world-anchor
```

- [ ] **Step 4: Watch the run to green + download the artifact**

Poll `gh run list --workflow "iOS unsigned IPA (Sideloadly)" --branch feat/qr-world-anchor` until the latest run concludes. On success, download the `SpatiSiteAnchor-unsigned-ipa` artifact. On failure, read `gh run view <id> --log-failed`, fix, re-run.
Expected: run `success`, artifact present.

- [ ] **Step 5: Hand off to the user**

Tell the user to sideload the new IPA (Sideloadly is now working) and run the walk-the-room checklist.

---

## Self-Review

**1. Spec coverage:**
- QR bootstrap + world-frame placement → Tasks 3, 5 (`cubeWorldPose`, cube as scene child). ✓
- Decoupled from marker (walk the room) → Task 5 (empty `ViroARImageMarker`, sibling `ViroNode`). ✓
- Optional reset on re-sight → Task 5 (`onAnchorUpdated` re-plants). ✓
- Vendored math + provenance + pin test → Tasks 1, 3. ✓
- `worldFromDetection` general path → Task 3. ✓
- Validation simplification (identity marker, translation offset, no Euler decompose) → Tasks 2, 3 (compose only; `cubeWorldPose`). ✓
- QR-as-image-target + measured physicalWidth → Tasks 4, 5, 6. ✓
- UX states (searching/anchored/limited/reset) → Task 5. ✓
- Offline tests + on-device checklist → Tasks 1–3, 6. ✓
- Non-goals respected (no `.glb`, no `@spati/geo`, no occlusion, no decode) → not built. ✓

**2. Placeholder scan:** No TBD/TODO. `QR_PHYSICAL_WIDTH_M`/`CUBE_OFFSET_M` are real constants with sensible defaults + on-device tweak notes, not placeholders. ✓

**3. Type consistency:** `Mat4`/`Vec3` from `mat4.ts` used everywhere; `cubeWorldPose(anchor,{offset})` signature matches its call in `WorldAnchorScene`; `mat4FromPosEuler(position,rotationDeg)` matches usage in `worldAnchor.ts`; tracking constants match Viro's exported enums. ✓

## Notes for the executor

- `@/` alias works for TS imports (expo-router default). Asset `require()` and the src imports in the scene use **relative** paths to avoid alias-in-require surprises.
- If `ViroARImageMarker` with no children fails to fire callbacks on device, add a single invisible `<ViroNode />` child — but try empty first.
- The Euler order in `viroBridge` only affects rotated data, which the validation scene never renders (offset is translation-only, rotation passes through). If real rotated survey data later renders wrong, add `posEulerFromMat4` and pin the order empirically then.
