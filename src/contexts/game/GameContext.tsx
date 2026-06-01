"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FingerName, GamePhase } from "@/lib/hand-tracking/types";
import { useFingersStore } from "@/contexts/fingers";
import { symmetricTipDistance } from "@/lib/hand-tracking/landmarks";
import type { FingersFrame } from "@/lib/hand-tracking/types";
import {
  TOGGLE_COOLDOWN_MS,
  TOUCH_OFF_THRESHOLD,
  TOUCH_ON_THRESHOLD,
  FINGER_NAMES,
} from "@/lib/hand-tracking/constants";

export type FingerInteractionState = {
  active: boolean;
  touching: boolean;
  lastToggleAt: number;
};

type GameContextValue = {
  phase: GamePhase;
  sessionId: string | null;
  fingerInteractions: Record<FingerName, FingerInteractionState>;
  setPhase: (phase: GamePhase) => void;
  startSession: () => void;
  endSession: () => void;
  /** Read interaction state updated each RAF from finger store. */
  tickInteractions: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

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

export function GameProvider({ children }: { children: ReactNode }) {
  const fingerStore = useFingersStore();
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fingerInteractions, setFingerInteractions] = useState(initialInteractions);

  const startSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setPhase("playing");
    setFingerInteractions(initialInteractions());
  }, []);

  const endSession = useCallback(() => {
    setPhase("ended");
    setSessionId(null);
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

  const value = useMemo<GameContextValue>(
    () => ({
      phase,
      sessionId,
      fingerInteractions,
      setPhase,
      startSession,
      endSession,
      tickInteractions,
    }),
    [phase, sessionId, fingerInteractions, startSession, endSession, tickInteractions],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
