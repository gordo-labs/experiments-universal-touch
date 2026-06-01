import type { PuzzlePhaseId } from "./types";

export type PhasePlayHints = {
  objective: string;
  steps: string[];
};

export const PHASE_PLAY_HINTS: Record<PuzzlePhaseId, PhasePlayHints> = {
  "phase-01": {
    objective: "Wake the five seals, then reach the heart of the threshold.",
    steps: [
      "Keep both hands in view. The space between them matters.",
      "Wake each seal by mirroring fingertips, or touch its orb with the matching finger.",
      "All five must answer before the center opens.",
      "When it calls to you, let your index find the core.",
    ],
  },
  "phase-02": {
    objective: "Find the three lights in the maze and turn them all red.",
    steps: [
      "Walk the labyrinth with keyboard to move and mouse to look around.",
      "The circles above mirror the spheres on the walls.",
      "Bring your hands in and touch a sphere with the finger whose color you want to leave on it.",
      "Red belongs to the thumb. When every light agrees, the maze follows.",
    ],
  },
  "phase-03": {
    objective:
      "Draw three paths across the field, each color from the left to its twin on the right.",
    steps: [
      "Your right index is the beam; keep that hand visible.",
      "Start from a colored star on the left. That hue is yours until the path is complete.",
      "Pale stars can anchor the beam; use them to route around what blocks you.",
      "Find the matching star on the right without crossing another color or doubling back on your own.",
      "Three colors, three crossings.",
    ],
  },
  "phase-04": {
    objective: "Set every star in motion, then close the portal at the center.",
    steps: [
      "Touch a loose star with your index and it will follow you.",
      "Each star has a ring that suits it; guide it there patiently.",
      "Different hues don't forgive a collision. The field resets if they meet.",
      "When all are circling, hold your right index on the core until the portal seals.",
    ],
  },
};
