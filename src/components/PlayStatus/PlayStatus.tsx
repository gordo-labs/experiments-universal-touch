"use client";

import { useCamera } from "@/contexts/camera";
import { useHandTracking } from "@/contexts/hand-tracking";
import styles from "./PlayStatus.module.css";

export function PlayStatus() {
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();

  const error = cameraError ?? trackingError;
  if (error) {
    return (
      <div className={styles.banner} role="alert">
        <p className={styles.errorTitle}>Cannot start play mode</p>
        <p className={styles.errorBody}>{error}</p>
        <p className={styles.hint}>
          Camera access requires HTTPS or localhost. Allow camera permission and reload.
        </p>
      </div>
    );
  }

  const loading =
    cameraStatus === "idle" ||
    cameraStatus === "requesting" ||
    trackingStatus === "loading-model";

  if (loading) {
    return (
      <div className={styles.banner}>
        <p className={styles.loading}>
          {trackingStatus === "loading-model"
            ? "Loading hand model…"
            : "Starting camera…"}
        </p>
      </div>
    );
  }

  return null;
}
