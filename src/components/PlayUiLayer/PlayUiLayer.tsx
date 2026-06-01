"use client";

import type { ReactNode } from "react";
import styles from "./PlayUiLayer.module.css";

type PlayUiLayerProps = {
  lobby?: ReactNode;
  victory?: ReactNode;
  implosion?: ReactNode;
  finale?: ReactNode;
  confetti?: ReactNode;
  chrome?: ReactNode;
  hud?: ReactNode;
  fps?: ReactNode;
  hands?: ReactNode;
};

/** Fixed overlay stack — always above the 3D / camera engine layer. */
export function PlayUiLayer({
  lobby,
  victory,
  implosion,
  finale,
  confetti,
  chrome,
  hud,
  fps,
  hands,
}: PlayUiLayerProps) {
  return (
    <div className={styles.layer} aria-live="polite">
      {confetti ? <div className={styles.confetti}>{confetti}</div> : null}
      {fps ? <div className={styles.fps}>{fps}</div> : null}
      {chrome ? <div className={styles.chrome}>{chrome}</div> : null}
      {hud ? <div className={styles.hud}>{hud}</div> : null}
      {hands ? <div className={styles.hands}>{hands}</div> : null}
      {lobby ? <div className={styles.lobby}>{lobby}</div> : null}
      {implosion ? <div className={styles.implosion}>{implosion}</div> : null}
      {victory ? <div className={styles.victory}>{victory}</div> : null}
      {finale ? <div className={styles.finale}>{finale}</div> : null}
    </div>
  );
}
