"use client";

import { useGameSession } from "@/game/react";
import { PUZZLE_PHASE_IDS, PUZZLE_PHASES } from "@/game/phases/types";
import { formatElapsedMs, sumPhaseTimes } from "@/game/session/format-elapsed";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import bannerStyles from "@/components/PlayBanner/PlayBanner.module.css";
import styles from "./EscapeFinaleScreen.module.css";

export function EscapeFinaleScreen() {
  const { endSession, startSession, phaseTimes, sessionStatus } = useGameSession();
  const open = sessionStatus === "finale";
  const totalMs = sumPhaseTimes(phaseTimes, PUZZLE_PHASE_IDS);

  return (
    <PlayModalPortal open={open}>
      <div className={bannerStyles.backdrop} role="dialog" aria-modal="true">
        <div className={bannerStyles.card}>
          <p className={bannerStyles.eyebrow}>You escaped</p>
          <h1 className={bannerStyles.title}>Los cuatro juegos completados</h1>
          <p className={bannerStyles.body}>
            Has superado los cuatro entornos del escape room.
          </p>

          <ul className={styles.results}>
            {PUZZLE_PHASE_IDS.map((phaseId) => (
              <li key={phaseId}>
                <span>{PUZZLE_PHASES[phaseId].gameLabel}</span>
                <span className={styles.time}>
                  {formatElapsedMs(phaseTimes[phaseId] ?? 0)}
                </span>
              </li>
            ))}
            <li className={styles.total}>
              <span>Total</span>
              <span className={styles.time}>{formatElapsedMs(totalMs)}</span>
            </li>
          </ul>

          <div className={styles.actions}>
            <button type="button" className={bannerStyles.cta} onClick={startSession}>
              Jugar de nuevo
            </button>
            <button type="button" className={styles.secondary} onClick={endSession}>
              Terminar sesión
            </button>
          </div>
        </div>
      </div>
    </PlayModalPortal>
  );
}
