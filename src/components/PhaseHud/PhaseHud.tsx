"use client";

import { FINGER_NAMES } from "@/modules/hand-engine";
import { useCamera, useHandTracking, useFingers } from "@/modules/hand-engine";
import { useGameSession, usePhaseRuntime } from "@/game/react";
import styles from "./PhaseHud.module.css";

export function PhaseHud() {
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();
  const { frame, bothHandsDetected } = useFingers();
  const { sessionStatus, currentPhaseId, fingerInteractions, victoryPanelOpen } =
    useGameSession();
  const runtime = usePhaseRuntime();

  const activeFingers = FINGER_NAMES.filter((n) => fingerInteractions[n].active);
  const progressPct = Math.round(runtime.progress * 100);

  return (
    <aside className={styles.hud}>
      <p className={styles.title}>
        {currentPhaseId} · {progressPct}%
      </p>
      <dl className={styles.grid}>
        <div>
          <dt>Session</dt>
          <dd>{sessionStatus}</dd>
        </div>
        <div>
          <dt>Camera</dt>
          <dd className={cameraStatus === "ready" ? styles.ok : styles.warn}>
            {cameraStatus}
          </dd>
        </div>
        <div>
          <dt>Hands</dt>
          <dd className={trackingStatus === "ready" ? styles.ok : styles.warn}>
            {trackingStatus}
          </dd>
        </div>
        <div>
          <dt>Both hands</dt>
          <dd className={bothHandsDetected ? styles.ok : styles.muted}>
            {bothHandsDetected ? "yes" : "no"}
          </dd>
        </div>
      </dl>

      {(cameraError || trackingError) && (
        <p className={styles.error}>{cameraError ?? trackingError}</p>
      )}

      {runtime.statusHint && (
        <p className={styles.hint}>{runtime.statusHint}</p>
      )}

      {victoryPanelOpen && (
        <p className={styles.ok}>Modal de victoria abierto</p>
      )}

      {sessionStatus === "playing" && currentPhaseId === "phase-01" && activeFingers.length > 0 && !runtime.allSealsActive && (
        <p className={styles.active}>
          Seals: <strong>{activeFingers.length}/5</strong>
        </p>
      )}

      {sessionStatus === "playing" && (
        <section className={styles.tips}>
          <h3>Fingertips</h3>
          <ul>
            {(["left", "right"] as const).map((side) => (
              <li key={side}>
                <strong>{side[0]}</strong>
                {FINGER_NAMES.map((name) => {
                  const tip = frame[side].tips[name];
                  return (
                    <span
                      key={name}
                      className={tip.visible ? styles.tipOn : styles.tipOff}
                    >
                      {name[0].toUpperCase()}
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
