import type { PuzzlePhaseId } from "../phases/types";

export const PHASE_RESET_EVENT = "scaperoom:phase-reset";

export type PhaseResetDetail = {
  phaseId: PuzzlePhaseId;
};

export function dispatchPhaseReset(phaseId: PuzzlePhaseId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PhaseResetDetail>(PHASE_RESET_EVENT, { detail: { phaseId } }),
  );
}

export function subscribePhaseReset(
  handler: (detail: PhaseResetDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<PhaseResetDetail>;
    if (custom.detail?.phaseId) handler(custom.detail);
  };
  window.addEventListener(PHASE_RESET_EVENT, listener);
  return () => window.removeEventListener(PHASE_RESET_EVENT, listener);
}
