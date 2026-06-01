import type { FingerName, FingersFrame, ScreenPoint } from "@/modules/hand-engine";

/** Stage centre — core orb sits here visually (mirrored selfie coords). */
export const STAGE_CENTER_MIRRORED: ScreenPoint = { x: 0.5, y: 0.5 };

/**
 * Index fingertip proximity to stage centre in pixel / mirrored space.
 * Matches the 2D hand overlay — ignores erroneous 3D depth.
 */
export function indexProximityToStageCenter(fingers: FingersFrame): number {
  const w = fingers.stageWidth;
  const h = fingers.stageHeight;
  const radiusPx = Math.min(Math.max(w, 320), Math.max(h, 180)) * 0.16;
  const radiusNorm = 0.14;

  let best = 0;
  const cx = w > 1 ? w * STAGE_CENTER_MIRRORED.x : 0;
  const cy = h > 1 ? h * STAGE_CENTER_MIRRORED.y : 0;

  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips.index;
    if (!tip.visible) continue;

    if (tip.pixel && w > 1 && h > 1) {
      const d = Math.hypot(tip.pixel.x - cx, tip.pixel.y - cy);
      best = Math.max(best, 1 - d / radiusPx);
    }

    if (tip.mirrored) {
      const d = Math.hypot(
        tip.mirrored.x - STAGE_CENTER_MIRRORED.x,
        tip.mirrored.y - STAGE_CENTER_MIRRORED.y,
      );
      best = Math.max(best, 1 - d / radiusNorm);
    }
  }

  return Math.max(0, Math.min(1, best));
}

export function fingerTouchesStageCenter(
  fingers: FingersFrame,
  finger: FingerName = "index",
  threshold = 0.22,
): boolean {
  if (finger !== "index") {
    return false;
  }
  return indexProximityToStageCenter(fingers) >= threshold;
}
