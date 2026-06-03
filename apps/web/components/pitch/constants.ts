/**
 * StatsBomb pitch: 120 × 80 units → FIFA 105m × 68m.
 * All markings derived from meter distances for 2D/3D parity.
 */

export const PITCH_LENGTH_U = 120;
export const PITCH_WIDTH_U = 80;

/** Real pitch size (meters). */
export const PITCH_LENGTH_M = 105;
export const PITCH_WIDTH_M = 68;

/** World-space pitch (Three.js X = length, Z = width). */
export const PITCH_LENGTH_W = 16.1;
export const PITCH_WIDTH_W = 10.75;
export const SCALE = PITCH_WIDTH_W / PITCH_WIDTH_U;
export const SCALE_LENGTH = PITCH_LENGTH_W / PITCH_LENGTH_U;

export const HALF_LENGTH_W = PITCH_LENGTH_W / 2;
export const HALF_WIDTH_W = PITCH_WIDTH_W / 2;

/** Meters → world units along pitch length (X). */
export function metersToWorldX(meters: number): number {
  return meters * (PITCH_LENGTH_W / PITCH_LENGTH_M);
}

/** Meters → world units along pitch width (Z). */
export function metersToWorldZ(meters: number): number {
  return meters * (PITCH_WIDTH_W / PITCH_WIDTH_M);
}

// --- FIFA goal (7.32m × 2.44m) ---
export const GOAL_WIDTH_M = 7.32;
export const GOAL_HEIGHT_M = 2.44;
export const GOAL_NET_DEPTH_M = 2;
export const GOAL_POST_DIAMETER_M = 0.12;

export const GOAL_WIDTH_W = metersToWorldZ(GOAL_WIDTH_M);
export const GOAL_HALF_Z = GOAL_WIDTH_W / 2;
/** Slight vertical exaggeration so goals read clearly on screen (ratio preserved). */
export const GOAL_HEIGHT_VISUAL_SCALE = 1.22;
export const GOAL_HEIGHT_W = metersToWorldZ(GOAL_HEIGHT_M) * GOAL_HEIGHT_VISUAL_SCALE;
export const GOAL_NET_DEPTH_W = metersToWorldX(GOAL_NET_DEPTH_M);
export const GOAL_POST_RADIUS_W = metersToWorldX(GOAL_POST_DIAMETER_M) / 2;

/** Goal line X (left / right). */
export const LEFT_GOAL_LINE_X = -HALF_LENGTH_W;
export const RIGHT_GOAL_LINE_X = HALF_LENGTH_W;

/** @deprecated Use LEFT_GOAL_LINE_X */
export const GOAL_LINE_X = LEFT_GOAL_LINE_X;

// --- Penalty & center markings ---
export const PBOX_DEPTH_W = metersToWorldX(16.5);
export const PBOX_HALF_Z = metersToWorldZ(40.32) / 2;
export const PBOX_FRONT_X_LEFT = LEFT_GOAL_LINE_X + PBOX_DEPTH_W;
export const PBOX_FRONT_X_RIGHT = RIGHT_GOAL_LINE_X - PBOX_DEPTH_W;

export const SIXYD_DEPTH_W = metersToWorldX(5.5);
export const SIXYD_HALF_Z = metersToWorldZ(18.32) / 2;
export const SIXYD_FRONT_X_LEFT = LEFT_GOAL_LINE_X + SIXYD_DEPTH_W;
export const SIXYD_FRONT_X_RIGHT = RIGHT_GOAL_LINE_X - SIXYD_DEPTH_W;

export const SPOT_X_LEFT = LEFT_GOAL_LINE_X + metersToWorldX(11);
export const SPOT_X_RIGHT = RIGHT_GOAL_LINE_X - metersToWorldX(11);

export const D_R_W = metersToWorldZ(9.15);
export const CENTER_R_W = D_R_W;
export const CORNER_ARC_W = metersToWorldX(1);

// Legacy aliases used by field line builder
export const PBOX_FRONT_X = PBOX_FRONT_X_LEFT;
export const SIXYD_FRONT_X = SIXYD_FRONT_X_LEFT;
export const SPOT_X = SPOT_X_LEFT;

export const LINE_COLOR = "#f8fafc";
export const GRASS_BASE = "#0c4a12";
export const GRASS_STRIPE_LIGHT = "#15803d";
export const GRASS_STRIPE_DARK = "#052e16";
export const TRACK_COLOR = "#3d2817";
export const STAND_COLORS = ["#0f172a", "#1e293b", "#0f172a", "#1e293b"] as const;

export const SVG_VIEW = { width: 920, height: 600, padding: 36 } as const;

/** StatsBomb (x, y) → Three.js [x, y, z]. */
export function statsbombToWorld(x: number, y: number): [number, number, number] {
  return [(x - 60) * SCALE_LENGTH, 0.1, (40 - y) * SCALE];
}

/** StatsBomb → SVG pixel coordinates. */
export function statsbombToSvg(
  x: number,
  y: number,
  width: number,
  height: number,
  padding: number,
): { sx: number; sy: number } {
  return {
    sx: padding + (x / PITCH_LENGTH_U) * (width - padding * 2),
    sy: padding + (y / PITCH_WIDTH_U) * (height - padding * 2),
  };
}

/** SVG inner pitch dimensions from FIFA proportions. */
export function getSvgPitchMarkings(innerW: number, innerH: number) {
  const mToPxX = (m: number) => (m / PITCH_LENGTH_M) * innerW;
  const mToPxY = (m: number) => (m / PITCH_WIDTH_M) * innerH;

  return {
    pboxW: mToPxX(16.5),
    pboxH: mToPxY(40.32),
    sixW: mToPxX(5.5),
    sixH: mToPxY(18.32),
    penaltySpotX: mToPxX(11),
    centerCircleR: mToPxY(9.15),
    cornerArcR: mToPxX(1),
    goalHalfW: mToPxY(7.32) / 2,
    goalHeightPx: mToPxY(2.44) * GOAL_HEIGHT_VISUAL_SCALE,
    netDepthPx: mToPxX(2),
    postStroke: Math.max(2.2, mToPxX(0.12) * 8),
  };
}