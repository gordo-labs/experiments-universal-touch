import type { PhaseRuntimeState } from "../environments/types";

/** Shared rule: environment sets `victoryLatched` when the puzzle goal is hit. */
export function isPhaseVictoryReady(state: PhaseRuntimeState): boolean {
  return state.victoryLatched || state.phaseComplete;
}
