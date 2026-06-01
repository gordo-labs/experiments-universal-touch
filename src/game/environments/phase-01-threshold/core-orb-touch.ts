import * as THREE from "three";
import type { FingersFrame } from "@/modules/hand-engine";
import { indexProximityToWorldOrb } from "../screen-touch";

/** World position of the phase-1 core orb. */
export const CORE_ORB_CENTER = new THREE.Vector3(0, 0.02, -0.06);

/**
 * Single threshold: animation pulse and victory modal share this value.
 * `proximity >= CORE_ORB_INSIDE_THRESHOLD` ⇔ finger inside the core.
 */
export const CORE_ORB_INSIDE_THRESHOLD = 0.08;

const PROBE = { screenRadiusPx: 170, worldRadius: 0.18 };

export type CoreOrbIndexTouch = {
  proximity: number;
  inside: boolean;
};

/** One probe for orb animation + victory (same signal). */
export function evaluateCoreOrbIndexTouch(
  fingers: FingersFrame,
  camera: THREE.PerspectiveCamera,
  coreCenter: THREE.Vector3 = CORE_ORB_CENTER,
): CoreOrbIndexTouch {
  const proximity = indexProximityToWorldOrb(fingers, camera, coreCenter, PROBE);
  return {
    proximity,
    inside: proximity >= CORE_ORB_INSIDE_THRESHOLD,
  };
}

/** True when the core is ready and the index is inside (modal trigger). */
export function shouldTriggerCoreVictory(
  touch: CoreOrbIndexTouch,
  sealsReady: boolean,
): boolean {
  return sealsReady && touch.inside;
}
