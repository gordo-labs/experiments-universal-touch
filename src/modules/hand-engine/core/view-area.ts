import type { ViewArea } from "./types";

export const DEFAULT_CAMERA = {
  fov: 46,
  positionZ: 1.45,
  near: 0.04,
  far: 40,
} as const;

export const DEFAULT_LANDMARK_DEPTH = -0.05;

/** Recompute visible world width/height at landmark depth plane. */
export function computeViewArea(
  aspect: number,
  cameraFovDeg = DEFAULT_CAMERA.fov,
  cameraZ = DEFAULT_CAMERA.positionZ,
  landmarkDepth = DEFAULT_LANDMARK_DEPTH,
): ViewArea {
  const dist = Math.max(cameraZ - landmarkDepth, 0.01);
  const vfov = (cameraFovDeg * Math.PI) / 180;
  const heightAt = 2 * dist * Math.tan(vfov / 2);
  return { widthAt: heightAt * aspect, heightAt };
}
