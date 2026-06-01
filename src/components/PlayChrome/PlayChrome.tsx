"use client";

import { useGameSession, useCurrentPhaseMeta } from "@/game/react";
import { StarMazeDirectionHint } from "@/components/StarMazeDirectionHint";
import styles from "./PlayChrome.module.css";

type PlayChromeProps = {
  gameNumber?: number;
};

export function PlayChrome(_props: PlayChromeProps) {
  const { sessionStatus, currentPhaseId } = useGameSession();
  const phase = useCurrentPhaseMeta();
  const showGame = sessionStatus === "playing";

  if (!showGame) {
    return null;
  }

  return (
    <div className={styles.phaseLabel}>
      <span className={styles.phaseIndex}>Phase {phase.index}</span>
      <span className={styles.phaseTitle}>{phase.title}</span>
      {currentPhaseId === "phase-03" ? (
        <>
          <div className={styles.phaseArrowWrap}>
            <StarMazeDirectionHint />
          </div>
          <span className={styles.phaseTagline}>your finger is connection</span>
        </>
      ) : null}
    </div>
  );
}
