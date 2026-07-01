import type { Vec3 } from './mat4';

/**
 * Physical width of the QR AS DISPLAYED, in meters. The QR is shown on the PC
 * monitor for validation; measure it on-screen with a ruler and set this value.
 * Default 0.15 = 15 cm. Wrong value → wrong metric scale → depth is off.
 */
export const QR_PHYSICAL_WIDTH_M = 0.15;

/**
 * Where the test cube sits relative to the QR, in the marker's local frame (m).
 * [0,0,0] = dead-centre on the detected QR — deterministically at the marker's
 * world position regardless of the anchor's axis convention, so no "which way is
 * front" guessing. (A -Z offset pushed the cube onto the camera → screen-filling.)
 */
export const CUBE_OFFSET_M: Vec3 = [0, 0, 0];
