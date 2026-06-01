export const PUZZLE_PHASE_IDS = [
  "phase-01",
  "phase-02",
  "phase-03",
  "phase-04",
] as const;

export type PuzzlePhaseId = (typeof PUZZLE_PHASE_IDS)[number];

export type PuzzlePhaseMeta = {
  id: PuzzlePhaseId;
  index: number;
  /** Display name e.g. "Game 1" */
  gameLabel: string;
  title: string;
  subtitle: string;
};

export const PUZZLE_PHASES: Record<PuzzlePhaseId, PuzzlePhaseMeta> = {
  "phase-01": {
    id: "phase-01",
    index: 1,
    gameLabel: "Game 1",
    title: "The Threshold",
    subtitle: "Awaken the five seals with your fingertips",
  },
  "phase-02": {
    id: "phase-02",
    index: 2,
    gameLabel: "Game 2",
    title: "The Maze is Red",
    subtitle: "Paint five spheres red, then the maze follows",
  },
  "phase-03": {
    id: "phase-03",
    index: 3,
    gameLabel: "Game 3",
    title: "The Star Maze",
    subtitle: "Connect matching stars with index-finger laser paths",
  },
  "phase-04": {
    id: "phase-04",
    index: 4,
    gameLabel: "Game 4",
    title: "The Elemental Orrery",
    subtitle: "Push elemental stars into orbit, then seal the cosmic core",
  },
};

export function nextPhaseId(current: PuzzlePhaseId): PuzzlePhaseId | null {
  const idx = PUZZLE_PHASE_IDS.indexOf(current);
  if (idx < 0 || idx >= PUZZLE_PHASE_IDS.length - 1) return null;
  return PUZZLE_PHASE_IDS[idx + 1];
}

export function isPuzzlePhaseId(value: string): value is PuzzlePhaseId {
  return (PUZZLE_PHASE_IDS as readonly string[]).includes(value);
}

/** Map URL segment `/play/N` → phase id (1–4). */
export function phaseIdFromGameNumber(gameNumber: number): PuzzlePhaseId | null {
  const id = PUZZLE_PHASE_IDS[gameNumber - 1];
  return id ?? null;
}

export function gameNumberFromPhaseId(phaseId: PuzzlePhaseId): number {
  return PUZZLE_PHASES[phaseId].index;
}
