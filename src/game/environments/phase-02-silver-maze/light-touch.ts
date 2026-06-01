import * as THREE from "three";
import {
  FINGER_COLORS,
  FINGER_NAMES,
  type FingerName,
  type FingersFrame,
} from "@/modules/hand-engine";
import { worldToMirroredScreen } from "../screen-touch";

export const THUMB_RED = FINGER_COLORS.thumb;
const _proj = new THREE.Vector3();

export type LightTouchResult = {
  proximity: number;
  finger: FingerName | null;
  touching: boolean;
  lightIndex: number;
};

export function isThumbRed(color: number): boolean {
  return color === THUMB_RED;
}

export function allLightsRed(colors: number[]): boolean {
  return colors.length > 0 && colors.every(isThumbRed);
}

function sphereScreenRadiusPx(
  camera: THREE.PerspectiveCamera,
  world: THREE.Vector3,
  sphereRadius: number,
  stageHeight: number,
): number {
  const dist = Math.max(camera.position.distanceTo(world), 0.35);
  const vFov = (camera.fov * Math.PI) / 180;
  const pxPerMeter = stageHeight / (2 * Math.tan(vFov / 2));
  return Math.max(28, (sphereRadius / dist) * pxPerMeter * 1.35);
}

function fingerHitsScreenDisc(
  fingers: FingersFrame,
  finger: FingerName,
  target: { x: number; y: number },
  radiusPx: number,
): boolean {
  const w = fingers.stageWidth;
  const h = fingers.stageHeight;
  if (w < 2 || h < 2) return false;

  const tx = target.x * w;
  const ty = target.y * h;

  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips[finger];
    if (!tip.visible) continue;

    if (tip.pixel) {
      if (Math.hypot(tip.pixel.x - tx, tip.pixel.y - ty) <= radiusPx) return true;
      continue;
    }

    if (tip.mirrored) {
      const px = tip.mirrored.x * w;
      const py = tip.mirrored.y * h;
      if (Math.hypot(px - tx, py - ty) <= radiusPx) return true;
    }
  }

  return false;
}

function fingerProximityToDisc(
  fingers: FingersFrame,
  finger: FingerName,
  target: { x: number; y: number },
  radiusPx: number,
): number {
  const w = fingers.stageWidth;
  const h = fingers.stageHeight;
  if (w < 2 || h < 2) return 0;

  const tx = target.x * w;
  const ty = target.y * h;
  let best = 0;

  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips[finger];
    if (!tip.visible) continue;

    const px = tip.pixel?.x ?? (tip.mirrored ? tip.mirrored.x * w : null);
    const py = tip.pixel?.y ?? (tip.mirrored ? tip.mirrored.y * h : null);
    if (px == null || py == null) continue;

    const d = Math.hypot(px - tx, py - ty);
    best = Math.max(best, 1 - d / radiusPx);
  }

  return Math.max(0, Math.min(1, best));
}

/** Pick the visible light whose 2D projection intersects a fingertip. */
export function findLightFingerTouch(
  fingers: FingersFrame,
  camera: THREE.PerspectiveCamera,
  lightWorlds: THREE.Vector3[],
  sphereRadius: number,
): LightTouchResult {
  let best: LightTouchResult = {
    lightIndex: -1,
    proximity: 0,
    finger: null,
    touching: false,
  };

  const stageH = fingers.stageHeight;

  for (let i = 0; i < lightWorlds.length; i++) {
    const world = lightWorlds[i];
    _proj.copy(world).project(camera);
    if (_proj.z > 1) continue;

    const target = worldToMirroredScreen(world, camera);
    const discR = sphereScreenRadiusPx(camera, world, sphereRadius, stageH);

    for (const finger of FINGER_NAMES) {
      if (fingerHitsScreenDisc(fingers, finger, target, discR)) {
        return { lightIndex: i, finger, touching: true, proximity: 1 };
      }

      const prox = fingerProximityToDisc(fingers, finger, target, discR * 1.2);
      if (prox > best.proximity) {
        best = { lightIndex: i, finger, touching: false, proximity: prox };
      }
    }
  }

  return best;
}
