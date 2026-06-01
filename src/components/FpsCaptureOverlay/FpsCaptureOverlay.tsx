"use client";

import { useEffect, useState } from "react";
import { useCamera } from "@/modules/hand-engine";
import { useGameSession } from "@/game/react";
import { usePlayAssistModalBlocking } from "@/components/PlayLeftControls";
import styles from "./FpsCaptureOverlay.module.css";

/** Shown when Game 2 pointer lock is off (ESC or before first capture). */
export function FpsCaptureOverlay() {
  const { stageRef } = useCamera();
  const { sessionStatus, currentPhaseId, welcomeOpen, victoryPanelOpen } = useGameSession();
  const assistModalBlocking = usePlayAssistModalBlocking();
  const [locked, setLocked] = useState(() => !!document.pointerLockElement);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const shouldShow =
    sessionStatus === "playing" &&
    currentPhaseId === "phase-02" &&
    !welcomeOpen &&
    !victoryPanelOpen &&
    !assistModalBlocking &&
    !locked;

  useEffect(() => {
    const sync = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", sync);
    sync();
    return () => document.removeEventListener("pointerlockchange", sync);
  }, []);

  useEffect(() => {
    if (!shouldShow) {
      setRect(null);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const update = () => setRect(stage.getBoundingClientRect());
    update();

    const ro = new ResizeObserver(update);
    ro.observe(stage);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [shouldShow, stageRef]);

  if (!shouldShow || !rect) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden
    >
      <span className={styles.hint}>Click to look around</span>
    </div>
  );
}
