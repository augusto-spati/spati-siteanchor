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

  // Re-plants on every update while the QR is visible (drift reset). When the QR
  // leaves view there are no more updates, so the pose freezes in the world frame
  // and ARKit world-tracking carries it as you walk the room.
  const onAnchor = (anchor: { position: Vec3; rotation: Vec3 }) => {
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
  debug: { fontFamily: 'Arial', fontSize: 18, color: '#FFD60A', textAlign: 'center', textAlignVertical: 'center' },
  badge: { fontFamily: 'Arial', fontSize: 22, color: '#34C759', textAlign: 'center', textAlignVertical: 'center' },
  button: { fontFamily: 'Arial', fontSize: 24, color: '#4C6FFF', textAlign: 'center', textAlignVertical: 'center' },
});
