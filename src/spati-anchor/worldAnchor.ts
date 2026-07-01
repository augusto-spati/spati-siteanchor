import { type Mat4, type Vec3, multiplyMat4, invertRigidMat4, applyMat4ToPoint, identityMat4 } from './mat4';
import { mat4FromPosEuler, posEulerFromMat4 } from './viroBridge';

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

/**
 * Full model placement (Phase A). Given a live QR detection and the QR's pose in
 * the MODEL's own frame (T_model←QR), compute where to render the whole model in
 * the ARKit world frame:
 *   T_world←model = T_world←QR ∘ (T_model←QR)⁻¹
 * Returns Viro position + Euler degrees. Model and world are both Y-up (glTF), so
 * no Z-up basis change (unlike the survey/CRS case).
 */
export function modelWorldPose(
  anchor: { position: Vec3; rotation: Vec3 },
  qrPoseInModel: Mat4,
): { position: Vec3; rotationDeg: Vec3 } {
  const tWorldMarker = mat4FromPosEuler(anchor.position, anchor.rotation);
  const tWorldModel = worldFromDetection(tWorldMarker, qrPoseInModel, identityMat4());
  return posEulerFromMat4(tWorldModel);
}
