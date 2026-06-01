"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import { subscribePhaseImplosion } from "@/game/events/phase-implosion";
import { dispatchPhaseReset, PHASE_RESET_EVENT } from "@/game/events/phase-reset";
import { useGameSession } from "@/game/react";
import styles from "./PhaseImplosionOverlay.module.css";

export function PhaseImplosionOverlay() {
  const { currentPhaseId, sessionStatus } = useGameSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return subscribePhaseImplosion(({ phaseId }) => {
      if (phaseId === "phase-04") setOpen(true);
    });
  }, []);

  useEffect(() => {
    const onReset = () => setOpen(false);
    window.addEventListener(PHASE_RESET_EVENT, onReset);
    return () => window.removeEventListener(PHASE_RESET_EVENT, onReset);
  }, []);

  const handleTryAgain = useCallback(() => {
    dispatchPhaseReset("phase-04");
    setOpen(false);
  }, []);

  const visible =
    open && sessionStatus === "playing" && currentPhaseId === "phase-04";

  return (
    <PlayModalPortal open={visible}>
      <div
        className={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-implosion-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.card}>
          <p className={styles.eyebrow}>Implosion</p>
          <h2 id="phase-implosion-title" className={styles.title}>
            Your stars imploded
          </h2>
          <p className={styles.body}>Try again.</p>
          <button type="button" className={styles.cta} onClick={handleTryAgain}>
            Try again
          </button>
        </div>
      </div>
    </PlayModalPortal>
  );
}

/** True while Game 4 implosion modal should block the hand overlay. */
export function useImplosionModalBlocking(): boolean {
  const { currentPhaseId, sessionStatus } = useGameSession();
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    return subscribePhaseImplosion(({ phaseId }) => {
      if (phaseId === "phase-04") setBlocking(true);
    });
  }, []);

  useEffect(() => {
    const clear = () => setBlocking(false);
    window.addEventListener(PHASE_RESET_EVENT, clear);
    return () => window.removeEventListener(PHASE_RESET_EVENT, clear);
  }, []);

  useEffect(() => {
    if (currentPhaseId !== "phase-04" || sessionStatus !== "playing") {
      setBlocking(false);
    }
  }, [currentPhaseId, sessionStatus]);

  return blocking;
}
