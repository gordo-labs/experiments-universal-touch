"use client";

import { useCamera } from "@/modules/hand-engine";
import { useGameSession, useCurrentPhaseMeta } from "@/game/react";
import styles from "./PlayChrome.module.css";

type PlayChromeProps = {
  gameNumber?: number;
};

export function PlayChrome({ gameNumber }: PlayChromeProps) {
  const { showCameraPreview, setShowCameraPreview } = useCamera();
  const { sessionStatus, endSession } = useGameSession();
  const phase = useCurrentPhaseMeta();
  const showGame = sessionStatus === "playing";
  const showFinale = sessionStatus === "finale";

  return (
    <>
      {showGame && (
        <div className={styles.phaseLabel}>
          {gameNumber != null && (
            <span className={styles.devRoute}>/play/{gameNumber}</span>
          )}
          <span className={styles.phaseIndex}>Phase {phase.index}</span>
          <span className={styles.phaseTitle}>{phase.title}</span>
        </div>
      )}

      <div className={styles.topRight}>
        <button
          type="button"
          className={styles.bgToggle}
          onClick={() => setShowCameraPreview(!showCameraPreview)}
          aria-pressed={showCameraPreview}
          disabled={!showGame}
        >
          <span
            className={`${styles.bgDot} ${showCameraPreview ? styles.bgDotOn : styles.bgDotOff}`}
          />
          {showCameraPreview ? "Camera on" : "Camera off"}
        </button>
        {showGame && !showFinale && (
          <button type="button" className={styles.endBtn} onClick={endSession}>
            End session
          </button>
        )}
      </div>
    </>
  );
}
