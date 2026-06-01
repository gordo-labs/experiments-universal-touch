"use client";

import { notFound } from "next/navigation";
import { PlayProviders } from "@/contexts/AppProviders";
import { GameShell } from "@/components/GameShell";
import { phaseIdFromGameNumber } from "@/game/phases/types";

type PlayGamePageProps = {
  gameNumber: number;
};

export function PlayGamePage({ gameNumber }: PlayGamePageProps) {
  const phaseId = phaseIdFromGameNumber(gameNumber);
  if (!phaseId) notFound();

  return (
    <PlayProviders initialPhaseId={phaseId}>
      <GameShell gameNumber={gameNumber} />
    </PlayProviders>
  );
}
