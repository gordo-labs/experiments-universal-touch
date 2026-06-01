import type { PuzzlePhaseId } from "./types";

export type PhaseWelcomeCopy = {
  body: string;
};

export const PHASE_WELCOME_COPY: Record<PuzzlePhaseId, PhaseWelcomeCopy> = {
  "phase-01": {
    body: "Five seals hold the threshold closed. Unite the stars at your fingertips to wake each seal, then discover what the center becomes.",
  },
  "phase-02": {
    body: "Somewhere in the red maze, three lights still burn against the dark. Find them, paint them with your touch, and the path will open for you to follow.",
  },
  "phase-03": {
    body: "Stars of color call to their twins across the void. Trace three paths, but never cross another hue.",
  },
  "phase-04": {
    body: "Loose stars drift between empty rings. Set them all spinning, then close the portal at the heart.",
  },
};
