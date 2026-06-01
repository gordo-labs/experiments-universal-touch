"use client";

import { useCamera } from "../../contexts/CameraContext";
import { useHandTracking } from "../../contexts/HandTrackingContext";
import styles from "./PlayStatus.module.css";

export function PlayStatus() {
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();

  const error = cameraError ?? trackingError;
  if (error) {
    return (
      <div className={styles.banner} role="alert">
        <p className={styles.errorTitle}>Cannot start</p>
        <p className={styles.errorBody}>{error}</p>
        <p className={styles.hint}>
          Allow camera access in your browser settings and try again.
        </p>
      </div>
    );
  }

  const loading =
    cameraStatus === "idle" ||
    cameraStatus === "requesting" ||
    trackingStatus === "loading-model";

  if (!loading) return null;

  return (
    <div className={styles.banner}>
      <p className={styles.loading}>
        {trackingStatus === "loading-model"
          ? "Getting ready…"
          : "Connecting to camera…"}
      </p>
    </div>
  );
}
