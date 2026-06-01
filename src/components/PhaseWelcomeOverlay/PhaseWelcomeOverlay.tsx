"use client";

import { useGameSession } from "@/game/react";
import { PlayModalPortal } from "@/components/PlayModalPortal";
import { PhaseWelcomeCard } from "@/components/PhaseWelcomeCard";

export function PhaseWelcomeOverlay() {
  const { sessionStatus, welcomeOpen, dismissWelcome } = useGameSession();
  const open = sessionStatus === "playing" && welcomeOpen;

  return (
    <PlayModalPortal open={open}>
      <div
        className="ts-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-welcome-title"
      >
        <PhaseWelcomeCard onAction={dismissWelcome} />
      </div>
    </PlayModalPortal>
  );
}

/** True while the per-game welcome modal should block hand overlay / gameplay input. */
export function useWelcomeModalBlocking(): boolean {
  const { sessionStatus, welcomeOpen } = useGameSession();
  return sessionStatus === "playing" && welcomeOpen;
}
