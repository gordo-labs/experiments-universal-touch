import type { FingerName, FingersFrame } from "@/modules/hand-engine";
import type { PuzzlePhaseId } from "../phases/types";
import type * as THREE from "three";

export type FingerInteractionState = {
  active: boolean;
  touching: boolean;
  lastToggleAt: number;
};

export type SceneMount = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas?: HTMLCanvasElement;
  renderer?: THREE.WebGLRenderer;
};

export type EnvironmentTick = {
  fingers: FingersFrame;
  interactions: Record<FingerName, FingerInteractionState>;
  dt: number;
  elapsed: number;
  camera: THREE.PerspectiveCamera;
};

/**
 * Live puzzle state — synced to React after each environment tick.
 *
 * Every environment MUST set:
 * - `victoryLatched` when the success interaction fires (same moment as 3D feedback)
 * - `phaseComplete` latched true once the puzzle is done
 * - `progress` 0–1 for HUD
 */
export type PhaseRuntimeState = {
  progress: number;
  statusHint: string;
  /** Latched on success trigger — GameSceneHost opens the victory modal. */
  victoryLatched: boolean;
  phaseComplete: boolean;
  /** @deprecated phase-01 HUD — mirrors victoryLatched for seals flow */
  allSealsActive: boolean;
  coreOrbVisible: boolean;
  coreOrbReveal: number;
  indexCoreProximity: number;
  fingersInCore: number;
  coreOrbTouched: boolean;
  /** phase-02: show hand overlay only near a wall light */
  handOverlayActive: boolean;
  /** phase-02: wall sphere colors for floating HUD (length 3). */
  mazeSphereColors?: number[];
  /** phase-02: 0–1 maze red wash before victory modal. */
  mazeRedWash?: number;
};

export const EMPTY_PHASE_RUNTIME: PhaseRuntimeState = {
  progress: 0,
  statusHint: "",
  victoryLatched: false,
  phaseComplete: false,
  allSealsActive: false,
  coreOrbVisible: false,
  coreOrbReveal: 0,
  indexCoreProximity: 0,
  fingersInCore: 0,
  coreOrbTouched: false,
  handOverlayActive: false,
};

/** Contract for each puzzle-phase 3D world. */
export interface GameEnvironment {
  readonly id: PuzzlePhaseId;
  mount(ctx: SceneMount): void;
  tick(input: EnvironmentTick): void;
  getRuntimeState(): PhaseRuntimeState;
  dispose(): void;
}

export type EnvironmentFactory = () => GameEnvironment;
