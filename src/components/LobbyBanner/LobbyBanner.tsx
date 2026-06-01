"use client";

import { useCamera, useHandTracking } from "@/modules/hand-engine";
import { useGameSession, useCurrentPhaseMeta } from "@/game/react";
import bannerStyles from "@/components/PlayBanner/PlayBanner.module.css";

type LobbyBannerProps = {
  gameNumber?: number;
};

export function LobbyBanner({ gameNumber }: LobbyBannerProps) {
  const { sessionStatus, startSession } = useGameSession();
  const phase = useCurrentPhaseMeta();
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();

  if (sessionStatus !== "lobby" && sessionStatus !== "ended") {
    return null;
  }

  const error = cameraError ?? trackingError;
  const loading =
    !error &&
    (cameraStatus === "idle" ||
      cameraStatus === "requesting" ||
      trackingStatus === "loading-model");

  return (
    <div className={bannerStyles.backdrop} role="dialog" aria-modal="true">
      <div className={bannerStyles.card}>
        {error ? (
          <>
            <p className={bannerStyles.errorTitle}>No se puede iniciar</p>
            <p className={bannerStyles.errorBody}>{error}</p>
            <p className={bannerStyles.hint}>
              Necesitas HTTPS o localhost y permiso de cámara.
            </p>
          </>
        ) : loading ? (
          <p className={bannerStyles.loading}>
            {trackingStatus === "loading-model"
              ? "Cargando modelo de manos…"
              : "Iniciando cámara…"}
          </p>
        ) : (
          <>
            {gameNumber != null && (
              <p className={bannerStyles.hint}>/play/{gameNumber}</p>
            )}
            <p className={bannerStyles.eyebrow}>{phase.gameLabel}</p>
            <h2 className={bannerStyles.title}>{phase.title}</h2>
            <p className={bannerStyles.subtitle}>{phase.subtitle}</p>
            <button type="button" className={bannerStyles.cta} onClick={startSession}>
              Start {phase.gameLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
