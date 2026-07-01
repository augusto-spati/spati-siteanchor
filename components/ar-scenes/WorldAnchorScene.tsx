import React, { useState } from 'react';
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
import { cubeWorldPose } from '../../src/spati-anchor/worldAnchor';
import { CUBE_OFFSET_M, QR_PHYSICAL_WIDTH_M } from '../../src/spati-anchor/fixtures';
import type { Vec3 } from '../../src/spati-anchor/mat4';

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

export default function WorldAnchorScene() {
  const [pose, setPose] = useState<Pose | null>(null);
  const [hint, setHint] = useState<string | null>('Aponte a câmera para o QR');
  // Diagnostics — surfaced on-screen so we can see which layer breaks:
  // trk = ARKit tracking state (1=unavailable, 2=limited, 3=normal),
  // events = count of image-anchor found/updated callbacks.
  const [trk, setTrk] = useState(0);
  const [events, setEvents] = useState(0);

  // Plant ONCE, then freeze. With numberOfTrackedImages=1 ARKit tracks the image
  // continuously and fires onAnchorUpdated ~60x/s; re-planting on each of those
  // slaved the cube to the jittery live image pose (it slid, then snapped back).
  // Instead we snapshot the FIRST detection into the world frame and let ARKit
  // world-tracking carry it as you walk. "Re-plantar" clears the pose so the next
  // detection re-references (deliberate drift reset).
  const onAnchor = (anchor: { position: Vec3; rotation: Vec3 }) => {
    setEvents((n) => n + 1);
    setPose((prev) =>
      prev ? prev : cubeWorldPose({ position: anchor.position, rotation: anchor.rotation }, CUBE_OFFSET_M),
    );
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
            source={require('../../assets/models/robot.glb')}
            position={[0.3, 0, 0]}
            scale={[0.2, 0.2, 0.2]}
            rotation={[0, 180, 0]}
            type="GLB"
          />
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
  debug: { fontFamily: 'Arial', fontSize: 18, color: '#FFD60A', textAlign: 'center', textAlignVertical: 'center' },
  badge: { fontFamily: 'Arial', fontSize: 22, color: '#34C759', textAlign: 'center', textAlignVertical: 'center' },
  button: { fontFamily: 'Arial', fontSize: 24, color: '#4C6FFF', textAlign: 'center', textAlignVertical: 'center' },
});
