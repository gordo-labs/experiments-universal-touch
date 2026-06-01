"use client";

import { FINGER_NAMES } from "@/lib/hand-tracking/constants";
import { useCamera } from "@/contexts/camera";
import { useHandTracking } from "@/contexts/hand-tracking";
import { useFingers } from "@/contexts/fingers";
import { useGame } from "@/contexts/game";
import styles from "./FingerDebugHud.module.css";

export function FingerDebugHud() {
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();
  const { frame, bothHandsDetected } = useFingers();
  const { phase, fingerInteractions } = useGame();

  const activeFingers = FINGER_NAMES.filter((n) => fingerInteractions[n].active);

  return (
    <aside className={styles.hud}>
      <p className={styles.title}>Escape Room · finger input</p>
      <dl className={styles.grid}>
        <div>
          <dt>Phase</dt>
          <dd>{phase}</dd>
        </div>
        <div>
          <dt>Camera</dt>
          <dd className={cameraStatus === "ready" ? styles.ok : styles.warn}>
            {cameraStatus}
          </dd>
        </div>
        <div>
          <dt>Hands model</dt>
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

      <section className={styles.tips}>
        <h3>Fingertips (mirrored px)</h3>
        <ul>
          {(["left", "right"] as const).map((side) => (
            <li key={side}>
              <strong>{side}</strong>
              {FINGER_NAMES.map((name) => {
                const tip = frame[side].tips[name];
                const px = tip.pixel;
                return (
                  <span key={name} className={tip.visible ? styles.tipOn : styles.tipOff}>
                    {name[0].toUpperCase()}
                    {px ? ` ${Math.round(px.x)},${Math.round(px.y)}` : " —"}
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      </section>

      {activeFingers.length > 0 && (
        <p className={styles.active}>
          Active pairs: <strong>{activeFingers.join(", ")}</strong>
        </p>
      )}
    </aside>
  );
}
