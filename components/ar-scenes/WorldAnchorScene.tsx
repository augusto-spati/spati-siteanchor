import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  ViroNode,
  ViroBox,
  Viro3DObject,
  ViroText,
  ViroAmbientLight,
  ViroMaterials,
  ViroTrackingStateConstants,
  ViroARTrackingReasonConstants,
} from '@reactvision/react-viro';
import { cubeWorldPose, nudgePose, type PoseNudge } from '../../src/spati-anchor/worldAnchor';
import { resolveModelSource } from '../../src/spati-anchor/modelSource';
import { CUBE_OFFSET_M, QR_PHYSICAL_WIDTH_M } from '../../src/spati-anchor/fixtures';
import type { Vec3 } from '../../src/spati-anchor/mat4';

// Bundled demo model (Phase B). A runtime modelUri overrides it (Phase E1).
const BUNDLED_MODEL = require('../../assets/models/robot.glb');

// Phase D fine-tune step sizes (world frame).
const TRANSLATE_STEP_M = 0.01; // 1 cm per tap
const YAW_STEP_DEG = 1; // 1° per tap

// The QR is registered as a tracked image. Its encoded content is never decoded.
// Wrapped so a registration failure (e.g. ARKit rejecting the image) is visible
// on-screen instead of failing silently.
let TARGETS_ERROR: string | null = null;
try {
  ViroARTrackingTargets.createTargets({
    qr: {
      source: require('../../assets/markers/qr.png'),
      orientation: 'Up',
      physicalWidth: QR_PHYSICAL_WIDTH_M,
      type: 'Image',
    },
  });
} catch (e) {
  TARGETS_ERROR = String(e);
}

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

export default function WorldAnchorScene(props: { sceneNavigator?: any } = {}) {
  // Phase E1: model URL supplied at launch via the navigator's viroAppProps.
  const modelUri: string | undefined = props.sceneNavigator?.viroAppProps?.modelUri;
  // Memoize: a remote {uri} object recreated every render makes Viro re-download
  // the model on each re-render (opacity toggle, nudge). Stable identity = no reload.
  const modelSource = useMemo(() => resolveModelSource(modelUri, BUNDLED_MODEL), [modelUri]);
  const [pose, setPose] = useState<Pose | null>(null);
  const [hint, setHint] = useState<string | null>('Aponte a câmera para o QR');
  // Diagnostics — surfaced on-screen so we can see which layer breaks:
  // trk = ARKit tracking state (1=unavailable, 2=limited, 3=normal),
  // events = count of image-anchor found/updated callbacks.
  const [trk, setTrk] = useState(0);
  const [events, setEvents] = useState(0);
  // Phase D: translucent "raio-X" mode to see the model over reality.
  const [xray, setXray] = useState(false);

  // Phase D fine-tune: accumulate small world-frame nudges onto the planted pose.
  const nudge = (n: PoseNudge) => setPose((p) => (p ? nudgePose(p, n) : p));

  // Plant ONCE, then go fully inert. With numberOfTrackedImages=1 ARKit fires
  // onAnchorUpdated ~60x/s; a ref guard drops every post-plant update WITHOUT any
  // setState, so there is zero re-render churn (the old setEvents(n+1) per update
  // re-rendered 60x/s → reloaded a remote model + cost FPS). We snapshot the FIRST
  // detection into the world frame and let ARKit world-tracking carry it as you
  // walk. "Re-plantar" re-arms the guard so the next detection re-references.
  const plantedRef = useRef(false);
  const replant = () => {
    plantedRef.current = false;
    setPose(null);
  };
  const onAnchor = (anchor: { position: Vec3; rotation: Vec3 }) => {
    if (plantedRef.current) return;
    plantedRef.current = true;
    setEvents((n) => n + 1);
    setPose(cubeWorldPose({ position: anchor.position, rotation: anchor.rotation }, CUBE_OFFSET_M));
  };

  return (
    <ViroARScene
      onTrackingUpdated={(state: number, reason: number) => {
        setTrk(state);
        const h = trackHint(state, reason);
        setHint(pose ? h : h ?? 'Aponte a câmera para o QR');
      }}
    >
      <ViroAmbientLight color="#ffffff" intensity={250} />

      <ViroText
        text={`dbg trk=${trk} ev=${events} tgt=${TARGETS_ERROR ? 'ERR' : 'ok'}`}
        position={[0, 0.6, -1.5]}
        scale={[0.3, 0.3, 0.3]}
        style={styles.debug}
      />

      {/* Trigger only — intentionally has no visible children. */}
      <ViroARImageMarker target="qr" onAnchorFound={onAnchor} onAnchorUpdated={onAnchor} />

      {pose && (
        <ViroNode position={pose.position} rotation={pose.rotation}>
          {/* Anchor marker + coordinate frame at the QR. */}
          <ViroBox scale={[0.12, 0.12, 0.12]} materials={['cube']} />
          <ViroBox position={[0.1, 0, 0]} scale={[0.2, 0.01, 0.01]} materials={['axisX']} />
          <ViroBox position={[0, 0.1, 0]} scale={[0.01, 0.2, 0.01]} materials={['axisY']} />
          <ViroBox position={[0, 0, 0.1]} scale={[0.01, 0.01, 0.2]} materials={['axisZ']} />
          {/* Phase B: a real .glb, offset 30cm along +X of the anchor. Proves glTF
              loading and that a model rides the SAME world pose — both objects must
              stay put together as you walk the room. */}
          <Viro3DObject
            source={modelSource}
            position={[0.3, 0, 0]}
            scale={[0.2, 0.2, 0.2]}
            rotation={[0, 180, 0]}
            opacity={xray ? 0.45 : 1}
            type="GLB"
          />
        </ViroNode>
      )}

      {pose && <ViroText text="Ancorado" position={[0, 0.35, -1.5]} scale={[0.4, 0.4, 0.4]} style={styles.badge} />}
      {hint && <ViroText text={hint} position={[0, 0, -1.5]} scale={[0.5, 0.5, 0.5]} style={styles.hint} />}

      {/* Phase D controls — visible only once planted. Positions are provisional;
          ergonomics get tuned on-device (Viro text sits in world space, not head-locked). */}
      {pose && (
        <>
          <ViroText
            text="Re-plantar"
            position={[-0.55, -0.4, -1.5]}
            scale={[0.4, 0.4, 0.4]}
            style={styles.button}
            onClick={replant}
          />
          <ViroText
            text={xray ? 'Raio-X: on' : 'Raio-X: off'}
            position={[0.55, -0.4, -1.5]}
            scale={[0.4, 0.4, 0.4]}
            style={styles.button}
            onClick={() => setXray((v) => !v)}
          />
          <ViroText text="X-" position={[-0.62, -0.62, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dx: -TRANSLATE_STEP_M })} />
          <ViroText text="X+" position={[-0.34, -0.62, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dx: TRANSLATE_STEP_M })} />
          <ViroText text="Z-" position={[0.34, -0.62, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dz: -TRANSLATE_STEP_M })} />
          <ViroText text="Z+" position={[0.62, -0.62, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dz: TRANSLATE_STEP_M })} />
          <ViroText text="Giro-" position={[-0.2, -0.78, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dYawDeg: -YAW_STEP_DEG })} />
          <ViroText text="Giro+" position={[0.2, -0.78, -1.5]} scale={[0.35, 0.35, 0.35]} style={styles.nudge} onClick={() => nudge({ dYawDeg: YAW_STEP_DEG })} />
        </>
      )}
    </ViroARScene>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: 'Arial', fontSize: 26, color: '#ffffff', textAlign: 'center', textAlignVertical: 'center' },
  debug: { fontFamily: 'Arial', fontSize: 18, color: '#FFD60A', textAlign: 'center', textAlignVertical: 'center' },
  badge: { fontFamily: 'Arial', fontSize: 22, color: '#34C759', textAlign: 'center', textAlignVertical: 'center' },
  button: { fontFamily: 'Arial', fontSize: 24, color: '#4C6FFF', textAlign: 'center', textAlignVertical: 'center' },
  nudge: { fontFamily: 'Arial', fontSize: 22, color: '#FFD60A', textAlign: 'center', textAlignVertical: 'center' },
});
