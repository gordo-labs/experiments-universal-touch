import type { PuzzlePhaseId } from "../phases/types";
import type { EnvironmentFactory, GameEnvironment } from "./types";
import { createPhaseOneEnvironment } from "./phase-01-threshold";
import { createSilverMazeEnvironment } from "./phase-02-silver-maze";
import { createStarMazeEnvironment } from "./phase-03-the-ward";
import { createElementalOrreryEnvironment } from "./phase-04-the-vault";

const REGISTRY: Record<PuzzlePhaseId, EnvironmentFactory> = {
  "phase-01": createPhaseOneEnvironment,
  "phase-02": createSilverMazeEnvironment,
  "phase-03": createStarMazeEnvironment,
  "phase-04": createElementalOrreryEnvironment,
};

export function createEnvironmentForPhase(phaseId: PuzzlePhaseId): GameEnvironment {
  return REGISTRY[phaseId]();
}

export type { GameEnvironment, EnvironmentFactory };
