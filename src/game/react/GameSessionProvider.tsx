"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FINGER_NAMES,
  useFingersStore,
  type FingerName,
  type FingersFrame,
} from "@/modules/hand-engine";
import { symmetricTipDistance } from "@/modules/hand-engine/core/landmarks";
import {
  TOGGLE_COOLDOWN_MS,
  TOUCH_OFF_THRESHOLD,
  TOUCH_ON_THRESHOLD,
} from "@/modules/hand-engine/core/constants";
import {
  nextPhaseId,
  PUZZLE_PHASE_IDS,
  PUZZLE_PHASES,
  type PuzzlePhaseId,
} from "../phases/types";
import type { EscapeSessionStatus } from "../session/types";
import type { FingerInteractionState } from "../environments/types";
import { dispatchPhaseReset } from "../events/phase-reset";

type GameSessionProviderProps = {
  children: ReactNode;
  /** Phase loaded for this route (e.g. /play/2 → phase-02). Dev: direct access; prod: gate later. */
  initialPhaseId?: PuzzlePhaseId;
};
type GameSessionContextValue = {
  sessionStatus: EscapeSessionStatus;
  currentPhaseId: PuzzlePhaseId;
  /** Phase tied to the current /play/N route. */
  entryPhaseId: PuzzlePhaseId;
  sessionId: string | null;
  completedPhases: PuzzlePhaseId[];
  fingerInteractions: Record<FingerName, FingerInteractionState>;
  victoryPanelOpen: boolean;
  /** Per-game intro modal — timer paused until dismissed. */
  welcomeOpen: boolean;
  /** Wall-clock start of the active puzzle (null while welcome or victory modal is open). */
  phaseStartedAt: number | null;
  /** Completed puzzle durations in milliseconds. */
  phaseTimes: Partial<Record<PuzzlePhaseId, number>>;
  startSession: () => void;
  /** Enter from lobby after welcome card — scene starts, timer runs. */
  enterGameFromLobby: () => void;
  dismissWelcome: () => void;
  endSession: () => void;
  /** Continue to next puzzle after phase victory modal. */
  advancePhase: () => void;
  /** After phase-04 victory — confetti + finale screen. */
  completeEscape: () => void;
  showVictoryPanel: () => void;
  /** Freeze and store elapsed time for the current puzzle. */
  recordPhaseTime: () => void;
  /** Restart the active puzzle (timer, interactions, environment). */
  resetCurrentPhase: () => void;
  setSessionStatus: (status: EscapeSessionStatus) => void;
  tickInteractions: () => void;
};

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

function initialInteractions(): Record<FingerName, FingerInteractionState> {
  return Object.fromEntries(
    FINGER_NAMES.map((name) => [
      name,
      { active: false, touching: false, lastToggleAt: -1e9 },
    ]),
  ) as Record<FingerName, FingerInteractionState>;
}

function updateInteractionsFromFrame(
  frame: FingersFrame,
  prev: Record<FingerName, FingerInteractionState>,
  now: number,
): Record<FingerName, FingerInteractionState> {
  const next = { ...prev };

  for (const name of FINGER_NAMES) {
    const state = { ...prev[name] };
    const dist = symmetricTipDistance(frame, name);
    const handsOk = frame.left.detected && frame.right.detected;

    const isTouching =
      handsOk &&
      dist !== null &&
      (state.touching ? dist < TOUCH_OFF_THRESHOLD : dist < TOUCH_ON_THRESHOLD);

    if (
      handsOk &&
      !state.touching &&
      isTouching &&
      now - state.lastToggleAt > TOGGLE_COOLDOWN_MS
    ) {
      state.active = !state.active;
      state.lastToggleAt = now;
    }

    state.touching = isTouching;
    next[name] = state;
  }

  return next;
}

export function GameSessionProvider({
  children,
  initialPhaseId = "phase-01",
}: GameSessionProviderProps) {
  const fingerStore = useFingersStore();
  const [sessionStatus, setSessionStatus] = useState<EscapeSessionStatus>("lobby");
  const [currentPhaseId, setCurrentPhaseId] = useState<PuzzlePhaseId>(initialPhaseId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completedPhases, setCompletedPhases] = useState<PuzzlePhaseId[]>([]);
  const [fingerInteractions, setFingerInteractions] = useState(initialInteractions);
  const [victoryPanelOpen, setVictoryPanelOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(null);
  const [phaseTimes, setPhaseTimes] = useState<Partial<Record<PuzzlePhaseId, number>>>({});

  const showVictoryPanel = useCallback(() => {
    setVictoryPanelOpen(true);
  }, []);

  const recordPhaseTime = useCallback(() => {
    setPhaseStartedAt((startedAt) => {
      if (startedAt === null) return null;
      const elapsed = performance.now() - startedAt;
      setPhaseTimes((prev) => ({ ...prev, [currentPhaseId]: elapsed }));
      return null;
    });
  }, [currentPhaseId]);

  const resetCurrentPhase = useCallback(() => {
    setVictoryPanelOpen(false);
    setWelcomeOpen(true);
    setFingerInteractions(initialInteractions());
    setPhaseStartedAt(null);
    setPhaseTimes((prev) => {
      const next = { ...prev };
      delete next[currentPhaseId];
      return next;
    });
    dispatchPhaseReset(currentPhaseId);
  }, [currentPhaseId]);

  const dismissWelcome = useCallback(() => {
    setWelcomeOpen(false);
    setPhaseStartedAt((started) => started ?? performance.now());
  }, []);

  const enterGameFromLobby = useCallback(() => {
    setSessionId((id) => id ?? crypto.randomUUID());
    setSessionStatus("playing");
    setVictoryPanelOpen(false);
    setWelcomeOpen(false);
    setPhaseStartedAt(performance.now());
    setFingerInteractions(initialInteractions());
  }, []);

  const startSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setSessionStatus("playing");
    setCurrentPhaseId(initialPhaseId);
    setCompletedPhases([]);
    setFingerInteractions(initialInteractions());
    setVictoryPanelOpen(false);
    setPhaseTimes({});
    setWelcomeOpen(true);
    setPhaseStartedAt(null);
  }, [initialPhaseId]);

  const endSession = useCallback(() => {
    setSessionStatus("ended");
    setSessionId(null);
    setVictoryPanelOpen(false);
    setWelcomeOpen(false);
    setPhaseStartedAt(null);
  }, []);

  const advancePhase = useCallback(() => {
    setVictoryPanelOpen(false);
    setWelcomeOpen(true);
    setPhaseStartedAt(null);
    setCurrentPhaseId((current) => {
      const next = nextPhaseId(current);
      if (!next) return current;
      setCompletedPhases((done) =>
        done.includes(current) ? done : [...done, current],
      );
      setFingerInteractions(initialInteractions());
      return next;
    });
  }, []);

  const completeEscape = useCallback(() => {
    setVictoryPanelOpen(false);
    setPhaseStartedAt(null);
    setCompletedPhases([...PUZZLE_PHASE_IDS]);
    setSessionStatus("finale");
  }, []);

  const tickInteractions = useCallback(() => {
    const frame = fingerStore.ref.current;
    const now = frame.timestamp || performance.now();
    setFingerInteractions((prev) => {
      const next = updateInteractionsFromFrame(frame, prev, now);
      for (const name of FINGER_NAMES) {
        const a = prev[name];
        const b = next[name];
        if (a.active !== b.active || a.touching !== b.touching) return next;
      }
      return prev;
    });
  }, [fingerStore]);

  const value = useMemo<GameSessionContextValue>(
    () => ({
      sessionStatus,
      currentPhaseId,
      entryPhaseId: initialPhaseId,
      sessionId,
      completedPhases,
      fingerInteractions,
      victoryPanelOpen,
      welcomeOpen,
      phaseStartedAt,
      phaseTimes,
      startSession,
      enterGameFromLobby,
      dismissWelcome,
      endSession,
      advancePhase,
      completeEscape,
      showVictoryPanel,
      recordPhaseTime,
      resetCurrentPhase,
      setSessionStatus,
      tickInteractions,
    }),
    [
      sessionStatus,
      currentPhaseId,
      initialPhaseId,
      sessionId,
      completedPhases,
      fingerInteractions,
      victoryPanelOpen,
      welcomeOpen,
      phaseStartedAt,
      phaseTimes,
      startSession,
      enterGameFromLobby,
      dismissWelcome,
      endSession,
      advancePhase,
      completeEscape,
      showVictoryPanel,
      recordPhaseTime,
      resetCurrentPhase,
      tickInteractions,
    ],
  );

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error("useGameSession must be used within GameSessionProvider");
  return ctx;
}

export function useCurrentPhaseMeta() {
  const { currentPhaseId } = useGameSession();
  return PUZZLE_PHASES[currentPhaseId];
}
