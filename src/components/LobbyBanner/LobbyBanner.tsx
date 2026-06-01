"use client";

import { useCamera, useHandTracking } from "@/modules/hand-engine";
import { useGameSession } from "@/game/react";
import { PhaseWelcomeCard } from "@/components/PhaseWelcomeCard";

type LobbyBannerProps = {
  gameNumber?: number;
};

export function LobbyBanner(_props: LobbyBannerProps) {
  const { sessionStatus, enterGameFromLobby } = useGameSession();
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
    <div className="ts-backdrop ts-backdropHeavy" role="dialog" aria-modal="true">
      {error ? (
        <div className="ts-card">
          <p className="ts-errorTitle">Cannot start</p>
          <p className="ts-errorBody">{error}</p>
          <p className="ts-hint">
            Allow camera access in your browser settings and try again.
          </p>
        </div>
      ) : loading ? (
        <div className="ts-card">
          <p className="ts-loading">Getting ready…</p>
        </div>
      ) : (
        <PhaseWelcomeCard onAction={enterGameFromLobby} />
      )}
    </div>
  );
}
