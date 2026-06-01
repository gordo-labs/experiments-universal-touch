import * as THREE from "three";
import type { FingerName, FingersFrame, HandSide, ScreenPoint } from "@/modules/hand-engine";

const _projected = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane();
const _planeHit = new THREE.Vector3();

/** World point → normalized screen (matches Three.js canvas, not selfie mirror). */
export function worldToScreen(
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
): ScreenPoint {
  _projected.copy(world);
  _projected.project(camera);
  const x = _projected.x * 0.5 + 0.5;
  const y = -_projected.y * 0.5 + 0.5;
  return { x, y };
}

/** World point → mirrored normalized screen (matches selfie video only). */
export function worldToMirroredScreen(
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
): ScreenPoint {
  const screen = worldToScreen(world, camera);
  return { x: 1 - screen.x, y: screen.y };
}

/** Mirrored fingertip screen → world on a Z plane (matches overlay + canvas alignment). */
export function screenPointToWorldOnZ(
  point: ScreenPoint,
  camera: THREE.PerspectiveCamera,
  z: number,
): THREE.Vector3 | null {
  _ndc.set(point.x * 2 - 1, 1 - point.y * 2);
  _raycaster.setFromCamera(_ndc, camera);
  _plane.set(new THREE.Vector3(0, 0, 1), -z);
  return _raycaster.ray.intersectPlane(_plane, _planeHit) ? _planeHit.clone() : null;
}

export function indexMirroredScreen(
  fingers: FingersFrame,
  side: HandSide,
): ScreenPoint | null {
  const tip = fingers[side].tips.index;
  if (!tip.visible) return null;
  return tip.mirrored;
}

type IndexWorldHit = {
  inside: boolean;
  proximity: number;
};

/** Index tip (mirrored / selfie) vs world point projected on the WebGL canvas. */
export function indexTipProximityToWorldOnCanvas(
  fingers: FingersFrame,
  camera: THREE.PerspectiveCamera,
  world: THREE.Vector3,
  radiusPx: number,
  side: HandSide | "both" = "both",
): IndexWorldHit {
  const target = worldToScreen(world, camera);
  const w = fingers.stageWidth;
  const h = fingers.stageHeight;
  let proximity = 0;
  let inside = false;

  const sides: HandSide[] = side === "both" ? ["left", "right"] : [side];

  for (const hand of sides) {
    const tip = fingers[hand].tips.index;
    if (!tip.visible) continue;

    let dx: number;
    let dy: number;

    if (tip.pixel && w > 1 && h > 1) {
      dx = tip.pixel.x - target.x * w;
      dy = tip.pixel.y - target.y * h;
    } else if (tip.mirrored) {
      const ref = Math.max(w, h, 720);
      dx = (tip.mirrored.x - target.x) * ref;
      dy = (tip.mirrored.y - target.y) * ref;
    } else {
      continue;
    }

    const d = Math.hypot(dx, dy);
    proximity = Math.max(proximity, 1 - d / (radiusPx * 1.55));
    if (d < radiusPx) inside = true;
  }

  return { inside, proximity: Math.max(0, Math.min(1, proximity)) };
}

/** Unproject the visible index tip onto a Z plane for laser / drag lines. */
export function nearestIndexWorldOnZ(
  fingers: FingersFrame,
  camera: THREE.PerspectiveCamera,
  z: number,
  side: HandSide | "both" = "both",
): THREE.Vector3 | null {
  const sides: HandSide[] = side === "both" ? ["right", "left"] : [side];
  for (const hand of sides) {
    const screen = indexMirroredScreen(fingers, hand);
    if (!screen) continue;
    const world = screenPointToWorldOnZ(screen, camera, z);
    if (world) return world;
  }
  return null;
}

type ScreenTouchOpts = {
  /** Normalized radius fallback when stage size unknown. */
  radiusNorm?: number;
  /** Pixel radius — preferred when stage dimensions are known. */
  radiusPx?: number;
};

/**
 * True when any visible tip of `finger` overlaps `target` on screen (ignores depth).
 */
export function fingerTouchesScreenTarget(
  fingers: FingersFrame,
  finger: FingerName,
  target: ScreenPoint,
  opts: ScreenTouchOpts = {},
): boolean {
  const radiusPx = opts.radiusPx ?? 88;
  const radiusNorm = opts.radiusNorm ?? 0.11;
  const { stageWidth: w, stageHeight: h } = fingers;

  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips[finger];
    if (!tip.visible) continue;

    if (tip.pixel && w > 1 && h > 1) {
      const tx = target.x * w;
      const ty = target.y * h;
      if (Math.hypot(tip.pixel.x - tx, tip.pixel.y - ty) < radiusPx) return true;
      continue;
    }

    if (tip.mirrored) {
      if (Math.hypot(tip.mirrored.x - target.x, tip.mirrored.y - target.y) < radiusNorm) {
        return true;
      }
    }
  }

  return false;
}

/** 0–1 proximity for UI feedback (1 = touching). Uses same radius for touch + feedback. */
export function fingerProximityToScreenTarget(
  fingers: FingersFrame,
  finger: FingerName,
  target: ScreenPoint,
  maxRadiusPx = 120,
): number {
  let best = 0;
  const w = fingers.stageWidth;
  const h = fingers.stageHeight;
  const radius = maxRadiusPx;

  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips[finger];
    if (!tip.visible) continue;

    if (tip.pixel && w > 1 && h > 1) {
      const tx = target.x * w;
      const ty = target.y * h;
      const d = Math.hypot(tip.pixel.x - tx, tip.pixel.y - ty);
      best = Math.max(best, 1 - d / radius);
    } else if (tip.mirrored) {
      const normRadius = radius / Math.max(w, h, 400);
      const d = Math.hypot(tip.mirrored.x - target.x, tip.mirrored.y - target.y);
      best = Math.max(best, 1 - d / normRadius);
    }
  }

  return Math.max(0, Math.min(1, best));
}

/**
 * Index proximity to a world-space orb — combines screen projection + 3D distance.
 * Either path can register a touch (covers overlay / depth mismatches).
 */
export function indexProximityToWorldOrb(
  fingers: FingersFrame,
  camera: THREE.PerspectiveCamera,
  worldCenter: THREE.Vector3,
  opts: { screenRadiusPx?: number; worldRadius?: number } = {},
): number {
  const screenRadiusPx = opts.screenRadiusPx ?? 160;
  const worldRadius = opts.worldRadius ?? 0.16;

  const target = worldToMirroredScreen(worldCenter, camera);
  const screenProx = fingerProximityToScreenTarget(
    fingers,
    "index",
    target,
    screenRadiusPx,
  );

  let worldProx = 0;
  for (const side of ["left", "right"] as const) {
    const tip = fingers[side].tips.index;
    if (!tip.visible || !tip.world) continue;
    const dx = tip.world.x - worldCenter.x;
    const dy = tip.world.y - worldCenter.y;
    const dz = tip.world.z - worldCenter.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    worldProx = Math.max(worldProx, 1 - d / worldRadius);
  }

  return Math.max(0, Math.min(1, Math.max(screenProx, worldProx)));
}
