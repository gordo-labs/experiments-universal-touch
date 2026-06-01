"use client";

import { useEffect } from "react";
import { HandEngineMount, HandOverlay, useCamera, useFingers } from "@/modules/hand-engine";
import { useGameSession } from "@/game/react";
import { GameSceneHost } from "@/components/GameSceneHost";
import { PhaseVictoryOverlay } from "@/components/PhaseVictoryOverlay";
import { PhaseImplosionOverlay, useImplosionModalBlocking } from "@/components/PhaseImplosionOverlay";
import { PhaseWelcomeOverlay, useWelcomeModalBlocking } from "@/components/PhaseWelcomeOverlay";
import { EscapeFinaleScreen, consumeFinaleReplayFlag } from "@/components/EscapeFinaleScreen";
import { PlayUiLayer } from "@/components/PlayUiLayer";
import { LobbyBanner } from "@/components/LobbyBanner";
import { SilverMazeColorHud } from "@/components/SilverMazeColorHud";
import { PlayControllerHud } from "@/components/PlayControllerHud";
import { PlayLeftControls, usePlayAssistModalBlocking } from "@/components/PlayLeftControls";
import { PlayChrome } from "@/components/PlayChrome";
import { FpsCaptureOverlay } from "@/components/FpsCaptureOverlay";
import styles from "./GameShell.module.css";

type GameShellProps = {
  gameNumber?: number;
};

export function GameShell({ gameNumber }: GameShellProps) {
  const { outerRef } = useCamera();
  const { frame } = useFingers();
  const { sessionStatus, currentPhaseId, startSession } = useGameSession();
  const showGame = sessionStatus === "playing";
  const showFinale = sessionStatus === "finale";
  const isSilverMaze = currentPhaseId === "phase-02";
  const isStarMaze = currentPhaseId === "phase-03";
  const isOrrery = currentPhaseId === "phase-04";
  const showIndexOnlyHands = isStarMaze || isOrrery;
  const implosionBlocking = useImplosionModalBlocking();
  const welcomeBlocking = useWelcomeModalBlocking();
  const assistModalBlocking = usePlayAssistModalBlocking();
  const uiModalBlocking = implosionBlocking || welcomeBlocking || assistModalBlocking;
  const showHandInEngine = showGame && !isSilverMaze && !showIndexOnlyHands;
  const handsOnScreen =
    (isStarMaze
      ? frame.right.detected
      : frame.left.detected || frame.right.detected) && !uiModalBlocking;

  useEffect(() => {
    if (consumeFinaleReplayFlag()) {
      startSession();
    }
  }, [startSession]);

  return (
    <div className={styles.root} ref={outerRef}>
      <div className={styles.engineLayer}>
        <HandEngineMount showOverlay={showHandInEngine}>
          {showGame ? <GameSceneHost /> : null}
        </HandEngineMount>
      </div>

      <PlayUiLayer
        fps={showGame && isSilverMaze ? <FpsCaptureOverlay /> : null}
        hands={
          showGame &&
          !uiModalBlocking &&
          (isSilverMaze || showIndexOnlyHands) ? (
            <HandOverlay
              fullViewport
              visible={handsOnScreen}
              variant={
                isStarMaze
                  ? "right-index-only"
                  : showIndexOnlyHands
                    ? "index-only"
                    : "full"
              }
            />
          ) : null
        }
        chrome={<PlayChrome gameNumber={gameNumber} />}
        floatingTop={showGame && isSilverMaze ? <SilverMazeColorHud /> : null}
        hud={showGame ? <PlayControllerHud /> : null}
        lobby={<LobbyBanner gameNumber={gameNumber} />}
      />

      <PlayLeftControls />

      {showGame ? (
        <>
          <PhaseWelcomeOverlay />
          <PhaseVictoryOverlay />
          <PhaseImplosionOverlay />
        </>
      ) : null}
      {showFinale ? <EscapeFinaleScreen /> : null}
    </div>
  );
}
