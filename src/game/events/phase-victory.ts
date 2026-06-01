import type { PuzzlePhaseId } from "../phases/types";

export const PHASE_VICTORY_EVENT = "scaperoom:phase-victory";

export type PhaseVictoryDetail = {
  phaseId: PuzzlePhaseId;
};

/** Dispatched once when an environment latches victory (RAF loop → React). */
export function dispatchPhaseVictory(phaseId: PuzzlePhaseId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PhaseVictoryDetail>(PHASE_VICTORY_EVENT, { detail: { phaseId } }),
  );
}

export function subscribePhaseVictory(
  handler: (detail: PhaseVictoryDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<PhaseVictoryDetail>;
    if (custom.detail?.phaseId) handler(custom.detail);
  };
  window.addEventListener(PHASE_VICTORY_EVENT, listener);
  return () => window.removeEventListener(PHASE_VICTORY_EVENT, listener);
}
