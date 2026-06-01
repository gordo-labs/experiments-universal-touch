"use client";

import type { ReactNode } from "react";
import { HandEngineProvider } from "@/modules/hand-engine";
import { GameSessionProvider, PhaseRuntimeProvider } from "@/game/react";
import type { PuzzlePhaseId } from "@/game/phases/types";

/** Hand engine + game session + phase runtime — mount on play routes. */
export function PlayProviders({
  children,
  initialPhaseId = "phase-01",
}: {
  children: ReactNode;
  initialPhaseId?: PuzzlePhaseId;
}) {
  return (
    <HandEngineProvider>
      <GameSessionProvider key={initialPhaseId} initialPhaseId={initialPhaseId}>
        <PhaseRuntimeProvider>{children}</PhaseRuntimeProvider>
      </GameSessionProvider>
    </HandEngineProvider>
  );
}

/** @deprecated Use PlayProviders */
export const GameProviders = PlayProviders;
