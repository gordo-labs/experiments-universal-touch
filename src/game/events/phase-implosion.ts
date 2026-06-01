import type { PuzzlePhaseId } from "../phases/types";

export const PHASE_IMPLOSION_EVENT = "scaperoom:phase-implosion";

export type PhaseImplosionDetail = {
  phaseId: PuzzlePhaseId;
};

export function dispatchPhaseImplosion(phaseId: PuzzlePhaseId): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PhaseImplosionDetail>(PHASE_IMPLOSION_EVENT, {
      detail: { phaseId },
    }),
  );
}

export function subscribePhaseImplosion(
  handler: (detail: PhaseImplosionDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<PhaseImplosionDetail>;
    if (custom.detail?.phaseId) handler(custom.detail);
  };
  window.addEventListener(PHASE_IMPLOSION_EVENT, listener);
  return () => window.removeEventListener(PHASE_IMPLOSION_EVENT, listener);
}
