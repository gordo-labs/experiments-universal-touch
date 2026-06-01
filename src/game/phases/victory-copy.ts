import type { PuzzlePhaseId } from "./types";

export type PhaseVictoryCopy = {
  eyebrow: string;
  body: string;
};

export const PHASE_VICTORY_COPY: Record<PuzzlePhaseId, PhaseVictoryCopy> = {
  "phase-01": {
    eyebrow: "Congratulations!",
    body: "You touched the core. On to the next game.",
  },
  "phase-02": {
    eyebrow: "Congratulations!",
    body: "The maze burns red. On to the next game.",
  },
  "phase-03": {
    eyebrow: "Congratulations!",
    body: "You linked all three constellations without crossing colors. One game left.",
  },
  "phase-04": {
    eyebrow: "Congratulations!",
    body: "Every star is in orbit and the cosmic core is sealed. You escaped!",
  },
};

export function isFinalPuzzlePhase(phaseId: PuzzlePhaseId): boolean {
  return phaseId === "phase-04";
}
