import type { PuzzlePhaseId } from "./types";

export type PhaseVictoryCopy = {
  eyebrow: string;
  body: string;
};

export const PHASE_VICTORY_COPY: Record<PuzzlePhaseId, PhaseVictoryCopy> = {
  "phase-01": {
    eyebrow: "Congrats!",
    body: "Has tocado el núcleo. Pasamos al siguiente juego.",
  },
  "phase-02": {
    eyebrow: "Congrats!",
    body: "Las cinco luces están en rojo. Pasamos al siguiente juego.",
  },
  "phase-03": {
    eyebrow: "Congrats!",
    body: "Has unido las tres constelaciones sin cruzar colores. Queda un juego más.",
  },
  "phase-04": {
    eyebrow: "Congrats!",
    body: "Has puesto todas las estrellas en órbita y cerrado el núcleo cósmico. ¡Has escapado!",
  },
};

export function isFinalPuzzlePhase(phaseId: PuzzlePhaseId): boolean {
  return phaseId === "phase-04";
}
