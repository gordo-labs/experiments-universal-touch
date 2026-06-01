"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  useGameSession,
  useCurrentPhaseMeta,
  usePhaseRuntimeStore,
} from "@/game/react";
import { subscribePhaseVictory } from "@/game/events/phase-victory";
import { PHASE_RESET_EVENT } from "@/game/events/phase-reset";
import { isPhaseVictoryReady } from "@/game/victory/detect-victory";
import {
  isFinalPuzzlePhase,
  PHASE_VICTORY_COPY,
} from "@/game/phases/victory-copy";
import { nextPhaseId, PUZZLE_PHASES, type PuzzlePhaseId } from "@/game/phases/types";
import { formatElapsedMs } from "@/game/session/format-elapsed";
import { releaseGameplayCapture } from "@/game/input/release-gameplay-capture";
import { useImplosionModalBlocking } from "@/components/PhaseImplosionOverlay";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import styles from "./PhaseVictoryOverlay.module.css";

function useRuntimeVictoryReady(): boolean {
  const store = usePhaseRuntimeStore();
  return useSyncExternalStore(
    store.subscribe,
    () => isPhaseVictoryReady(store.getSnapshot()),
    () => false,
  );
}

export function PhaseVictoryOverlay() {
  const [eventPhaseId, setEventPhaseId] = useState<PuzzlePhaseId | null>(null);
  const recordedRef = useRef(false);
  const {
    currentPhaseId,
    advancePhase,
    completeEscape,
    victoryPanelOpen,
    showVictoryPanel,
    sessionStatus,
    phaseTimes,
    phaseStartedAt,
    recordPhaseTime,
  } = useGameSession();
  const runtimeReady = useRuntimeVictoryReady();
  const implosionBlocking = useImplosionModalBlocking();
  const phase = useCurrentPhaseMeta();
  const copy = PHASE_VICTORY_COPY[currentPhaseId];
  const nextId = nextPhaseId(currentPhaseId);
  const nextPhase = nextId ? PUZZLE_PHASES[nextId] : null;
  const isFinal = isFinalPuzzlePhase(currentPhaseId);

  useEffect(() => {
    return subscribePhaseVictory(({ phaseId }) => setEventPhaseId(phaseId));
  }, []);

  useEffect(() => {
    const clearVictory = () => setEventPhaseId(null);
    window.addEventListener(PHASE_RESET_EVENT, clearVictory);
    return () => window.removeEventListener(PHASE_RESET_EVENT, clearVictory);
  }, []);

  const victoryForCurrentPhase =
    victoryPanelOpen ||
    runtimeReady ||
    eventPhaseId === currentPhaseId;

  const showModal =
    sessionStatus === "playing" && victoryForCurrentPhase && !implosionBlocking;

  useEffect(() => {
    if (showModal) showVictoryPanel();
  }, [showModal, showVictoryPanel]);

  useEffect(() => {
    if (!showModal) {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;
    recordPhaseTime();
    releaseGameplayCapture();
  }, [showModal, recordPhaseTime]);

  const completedMs =
    phaseTimes[currentPhaseId] ??
    (phaseStartedAt !== null ? performance.now() - phaseStartedAt : 0);

  const handleContinue = () => {
    if (isFinal) completeEscape();
    else advancePhase();
  };

  return (
    <PlayModalPortal open={showModal}>
      <div
        className={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-victory-title"
      >
        <div className={styles.card}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h2 id="phase-victory-title" className={styles.title}>
            {phase.gameLabel} — {phase.title}
          </h2>
          <p className={styles.body}>
            Congrats, you made it at <strong>{formatElapsedMs(completedMs)}</strong>.
          </p>
          <p className={styles.subtitle}>{copy.body}</p>
          {isFinal ? (
            <button type="button" className={styles.cta} onClick={handleContinue}>
              Ver final — confetti
            </button>
          ) : nextPhase ? (
            <>
              <p className={styles.hint}>
                Siguiente: <strong>{nextPhase.gameLabel}</strong> — {nextPhase.title}
              </p>
              <button type="button" className={styles.cta} onClick={handleContinue}>
                Continuar a {nextPhase.gameLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </PlayModalPortal>
  );
}
