"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSession, useCurrentPhaseMeta } from "@/game/react";
import { PHASE_PLAY_HINTS } from "@/game/phases/play-hints";
import { formatElapsedMs } from "@/game/session/format-elapsed";
import { releaseGameplayCapture } from "@/game/input/release-gameplay-capture";
import {
  dispatchPlayAssistModal,
  subscribePlayAssistModal,
} from "@/game/events/play-assist-modal";
import { PlayControlsPortal } from "@/components/PlayControlsPortal";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import styles from "./PlayLeftControls.module.css";

function HomeIcon() {
  return (
    <svg
      className={styles.homeIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

/** True while home / reset / hints modal is open (hide hand overlay). */
export function usePlayAssistModalBlocking(): boolean {
  const [blocking, setBlocking] = useState(false);

  useEffect(() => subscribePlayAssistModal(setBlocking), []);

  return blocking;
}

export function PlayLeftControls() {
  const router = useRouter();
  const {
    sessionStatus,
    currentPhaseId,
    phaseStartedAt,
    phaseTimes,
    victoryPanelOpen,
    welcomeOpen,
    resetCurrentPhase,
    endSession,
  } = useGameSession();
  const phase = useCurrentPhaseMeta();
  const hints = PHASE_PLAY_HINTS[currentPhaseId];
  const [now, setNow] = useState(() => performance.now());
  const [homeOpen, setHomeOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hintsOpen, setHintsOpen] = useState(false);

  const showGameControls = sessionStatus === "playing" && !victoryPanelOpen && !welcomeOpen;
  const assistModalOpen = homeOpen || resetOpen || hintsOpen;

  useEffect(() => {
    if (!showGameControls || phaseStartedAt === null) {
      return;
    }
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [showGameControls, phaseStartedAt]);

  useEffect(() => {
    dispatchPlayAssistModal(assistModalOpen);
    if (assistModalOpen) releaseGameplayCapture();
  }, [assistModalOpen]);

  if (sessionStatus === "finale") {
    return null;
  }

  const elapsedMs =
    phaseStartedAt !== null ? now - phaseStartedAt : (phaseTimes[currentPhaseId] ?? 0);

  function openHome() {
    releaseGameplayCapture();
    setHomeOpen(true);
  }

  function openReset() {
    releaseGameplayCapture();
    setResetOpen(true);
  }

  function openHints() {
    releaseGameplayCapture();
    setHintsOpen(true);
  }

  function confirmReset() {
    resetCurrentPhase();
    setResetOpen(false);
  }

  function confirmHome() {
    releaseGameplayCapture();
    endSession();
    setHomeOpen(false);
    router.push("/");
  }

  return (
    <>
      <PlayControlsPortal>
        <button
          type="button"
          className={styles.homeBtn}
          onClick={openHome}
          aria-label="Home"
          title="Home"
        >
          <HomeIcon />
        </button>

        {showGameControls ? (
          <>
            <div
              className={styles.timer}
              aria-live="off"
              aria-label={`Elapsed time ${formatElapsedMs(elapsedMs)}`}
            >
              <span className={styles.label}>Time</span>
              {formatElapsedMs(elapsedMs)}
            </div>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.resetBtn}`}
              onClick={openReset}
            >
              Reset
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.hintsBtn}`}
              onClick={openHints}
            >
              Hints
            </button>
          </>
        ) : null}
      </PlayControlsPortal>

      <PlayModalPortal open={homeOpen}>
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Home</p>
            <h2 className={styles.title}>Leave and start over?</h2>
            <p className={styles.body}>
              You will return to the intro. Progress in <strong>{phase.gameLabel}</strong> will
              be lost.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.cta} onClick={confirmHome}>
                Go home
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setHomeOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </PlayModalPortal>

      <PlayModalPortal open={resetOpen}>
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Reset</p>
            <h2 className={styles.title}>Restart {phase.gameLabel}?</h2>
            <p className={styles.body}>
              <strong>{phase.title}</strong> will restart from the beginning and this game&apos;s
              timer will reset.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.ctaDanger} onClick={confirmReset}>
                Reset game
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </PlayModalPortal>

      <PlayModalPortal open={hintsOpen}>
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <div className={styles.card}>
            <p className={styles.eyebrow}>Hints</p>
            <h2 className={styles.title}>
              {phase.gameLabel}: {phase.title}
            </h2>
            <p className={styles.body}>{hints.objective}</p>
            <ol className={styles.steps}>
              {hints.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cta}
                onClick={() => setHintsOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </PlayModalPortal>
    </>
  );
}
