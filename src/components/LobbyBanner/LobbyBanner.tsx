"use client";

import { useState } from "react";
import { useCamera, useHandTracking } from "@/modules/hand-engine";
import { useGameSession } from "@/game/react";
import { PhaseWelcomeCard } from "@/components/PhaseWelcomeCard";
import { HandsReminderCard } from "@/components/HandsReminderCard";

type LobbyBannerProps = {
  gameNumber?: number;
};

export function LobbyBanner(_props: LobbyBannerProps) {
  const { sessionStatus, currentPhaseId, enterGameFromLobby } = useGameSession();
  const { status: cameraStatus, error: cameraError } = useCamera();
  const { status: trackingStatus, error: trackingError } = useHandTracking();
  const [handsReminderDone, setHandsReminderDone] = useState(false);

  if (sessionStatus !== "lobby" && sessionStatus !== "ended") {
    return null;
  }

  const error = cameraError ?? trackingError;
  const loading =
    !error &&
    (cameraStatus === "idle" ||
      cameraStatus === "requesting" ||
      trackingStatus === "loading-model");

  const showHandsReminder = currentPhaseId === "phase-01" && !handsReminderDone;

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
      ) : showHandsReminder ? (
        <HandsReminderCard onContinue={() => setHandsReminderDone(true)} />
      ) : (
        <PhaseWelcomeCard onAction={enterGameFromLobby} />
      )}
    </div>
  );
}
