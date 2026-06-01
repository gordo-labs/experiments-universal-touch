"use client";

import { useRouter } from "next/navigation";
import { useGameSession } from "@/game/react";
import { PUZZLE_PHASE_IDS, PUZZLE_PHASES } from "@/game/phases/types";
import { formatElapsedMs, sumPhaseTimes } from "@/game/session/format-elapsed";
import { ConfettiLayer } from "@/components/ConfettiLayer";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import styles from "./EscapeFinaleScreen.module.css";

const REPLAY_FLAG = "touching-stars-replay";
const LABS_URL = "https://gordo.design";

export function setFinaleReplayFlag(): void {
  try {
    sessionStorage.setItem(REPLAY_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function consumeFinaleReplayFlag(): boolean {
  try {
    if (sessionStorage.getItem(REPLAY_FLAG) !== "1") return false;
    sessionStorage.removeItem(REPLAY_FLAG);
    return true;
  } catch {
    return false;
  }
}

export function EscapeFinaleScreen() {
  const router = useRouter();
  const { endSession, phaseTimes, sessionStatus } = useGameSession();
  const open = sessionStatus === "finale";
  const totalMs = sumPhaseTimes(phaseTimes, PUZZLE_PHASE_IDS);

  const handlePlayAgain = () => {
    setFinaleReplayFlag();
    router.push("/play/1");
  };

  const handleGoToLabs = () => {
    endSession();
    window.location.assign(LABS_URL);
  };

  return (
    <PlayModalPortal open={open}>
      <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="finale-title">
        <ConfettiLayer active />
        <div className={styles.backdrop}>
          <div className={styles.aurora} aria-hidden />
          <div className={styles.stars} aria-hidden />
          <div className={styles.cardWrap}>
            <div className={styles.cardHalo} aria-hidden />
            <div className={styles.card}>
              <div className={styles.crown} aria-hidden>
                <span className={styles.crownCore} />
                <span className={styles.crownRing} />
              </div>
              <p className={styles.eyebrow}>Touching Stars</p>
              <h1 id="finale-title" className={styles.title}>
                <span className={styles.titleText}>You achieved universe control</span>
              </h1>
              <div className={styles.poem} aria-label="Finale verse">
                <p className={styles.verse}>All four trials complete.</p>
                <p className={styles.verse}>The constellations are gone.</p>
                <p className={styles.verse}>The Crossmint awaits,</p>
                <p className={styles.verse}>the challenge is done</p>
              </div>

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
                <button type="button" className={styles.cta} onClick={handlePlayAgain}>
                  Play again
                </button>
                <button type="button" className={styles.labs} onClick={handleGoToLabs}>
                  Go to the labs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlayModalPortal>
  );
}
