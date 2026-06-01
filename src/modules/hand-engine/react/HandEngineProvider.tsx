"use client";

import type { ReactNode } from "react";
import { CameraProvider } from "./contexts/CameraContext";
import { HandTrackingProvider } from "./contexts/HandTrackingContext";
import { SceneProvider } from "./contexts/SceneContext";
import { FingersProvider } from "./contexts/FingersContext";

export type HandEngineProviderProps = {
  children: ReactNode;
  /** When false, camera preview stays hidden (tracking still runs). Default: false */
  showCameraPreview?: boolean;
};

/**
 * Self-contained hand-tracking stack. Mount anywhere you need finger input.
 *
 * Camera → HandTracking → Scene → Fingers
 */
export function HandEngineProvider({ children }: HandEngineProviderProps) {
  return (
    <CameraProvider>
      <HandTrackingProvider>
        <SceneProvider>
          <FingersProvider>{children}</FingersProvider>
        </SceneProvider>
      </HandTrackingProvider>
    </CameraProvider>
  );
}
