# Spati SiteAnchor (native AR)

On-site BIM-vs-reality AR for iOS/Android — native **ARKit/ARCore** via
[ViroReact](https://reactvision.xyz/). This is the native counterpart to the
web SiteAnchor harness (in the `spati` monorepo). Native ARKit gives real 6DOF
tracking + LiDAR depth/occlusion on iPhone Pro, which the browser (monocular
web SLAM) can't — it's the fix for the translation drift we hit on the web.

> **Status: toolchain smoke-test.** Right now this is the ReactVision starter
> playground (plane detection, physics, depth occlusion, geospatial anchors)
> rebranded to Spati. Goal: prove the **Mac-less build → install → hot-reload**
> loop on a real iPhone 14 Pro before porting the real SiteAnchor features
> (`@spati/geo` georeference math, QR/image-marker anchoring, `.glb` overlay).

## Stack

- **Expo 55** + **expo-router** + **TypeScript**
- **@reactvision/react-viro 2.56** (ARKit + ARCore, MIT)
- Builds on **EAS Build** (cloud macOS — no Mac needed on your side)

## The free, Mac-less dev loop

The idea: **build the native "dev client" once in the cloud, then iterate in
JS/TSX with hot-reload over the network — no rebuilds** until you add a native
dependency.

### One-time setup

```bash
npm i -g eas-cli
eas login                 # free Expo account (expo.dev)
npm install               # or: yarn
```

On the **iPhone 14 Pro**: same Wi-Fi as the PC, a USB cable handy.

### Build the dev client (cloud, ~15 min)

```bash
eas device:create         # register your iPhone (follow the QR/profile steps)
eas build --profile development --platform ios
```

When prompted for credentials, log in with your **free Apple ID** — EAS creates
a free development provisioning profile. When the build finishes, EAS shows a
**QR / install link**: open it on the iPhone to install.

Then on the iPhone: **Settings → Privacy & Security → Developer Mode → On**
(reboot), and trust the developer certificate under **Settings → General →
VPN & Device Management**.

> Free-Apple-ID builds **expire after 7 days** — just re-run `eas build` (or use
> the Sideloadly fallback below) to refresh.

### Iterate (hot-reload, no rebuild)

```bash
npx expo start --dev-client
```

Open the installed **Spati SiteAnchor** app on the iPhone → it connects to the
Metro server → **save a `.tsx` and it updates live**. This is the dynamic
testing loop; you only rebuild when you touch native code / add a native dep.

### Fallback: Sideloadly (if EAS free provisioning misbehaves)

1. `eas build --profile development --platform ios` → download the `.ipa` from
   the build page.
2. On Windows, [Sideloadly](https://sideloadly.io/) (needs Apple's iTunes +
   iCloud from apple.com, **not** the Microsoft Store versions) → drag the
   `.ipa`, sign with your **free Apple ID**, install over USB. Auto re-signs
   every 7 days while Sideloadly is running on the same network.

## What to expect in the app (smoke test)

The opening screen is an AR menu — tap an entry:

- **Auto Plane** — ARKit detects surfaces; tap to place 3D content (the "does
  6DOF tracking hold?" test — should NOT slide like the web version).
- **Physics Demo / Shaders** — rendering sanity.
- Occlusion toggle lives in **Settings** (gear icon) — on a 14 Pro this uses
  **LiDAR depth** so real objects occlude the virtual ones.
- **Geospatial Anchors** needs a Google Cloud API key (left as a placeholder) —
  skip it for now.

## Next (after the loop is proven)

1. Strip the demo → a single AR scene.
2. Port `@spati/geo` + `@spati/coordinates-contract` (pure TS) for georeference.
3. `ViroARImageMarker` (QR) → compute SLAM→survey transform → anchor.
4. Load a real project `.glb`; deviation heatmap; issues/API.

## QR world-anchor validation (walk-the-room test)

The `WorldAnchorScene` is the current entry screen. It proves the native pivot:
the QR is a **one-time bootstrap**, then the overlay lives in the ARKit **world**
frame so you can walk the whole room away from the QR and it stays put.

1. On the PC, open `assets/markers/qr.png` and display it large. **Measure the
   on-screen QR width with a ruler.** If it is not ~15 cm, set the measured value
   (in meters) in `src/spati-anchor/fixtures.ts` → `QR_PHYSICAL_WIDTH_M` and
   rebuild.
2. Launch **Spati SiteAnchor** on the iPhone 14 Pro. Point at the QR.
3. A blue cube with XYZ axes appears near the QR ("Ancorado" shows).
4. **Put the phone down-ish and walk around the whole room.** The cube must stay
   put in the world — it does NOT need the QR in view.
5. Return and re-sight the QR → it re-plants (drift reset). "Re-plantar" clears it
   so you can repeat.
6. Tracking hints ("Mova mais devagar" / "Aponte para uma área com mais detalhe")
   show when ARKit tracking degrades.

Offline math tests: `yarn test` (vitest, no device needed).
