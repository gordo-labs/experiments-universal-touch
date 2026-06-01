"use client";

import { useCurrentPhaseMeta } from "@/game/react";
import { PHASE_WELCOME_COPY } from "@/game/phases/phase-welcome-copy";
import { WasdKeysHint } from "@/components/WasdKeysHint";

type PhaseWelcomeCardProps = {
  onAction: () => void;
  actionLabel?: string;
};

/** Shared Tron welcome card — title + conceptual blurb + CTA. */
export function PhaseWelcomeCard({
  onAction,
  actionLabel = "Let's go",
}: PhaseWelcomeCardProps) {
  const phase = useCurrentPhaseMeta();
  const copy = PHASE_WELCOME_COPY[phase.id];

  return (
    <div className="ts-card">
      <p className="ts-eyebrow">{phase.gameLabel}</p>
      <h2 className="ts-title" id="phase-welcome-title">
        {phase.title}
      </h2>
      <p className="ts-body">{copy.body}</p>
      {phase.id === "phase-02" ? <WasdKeysHint /> : null}
      <button type="button" className="ts-cta" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
