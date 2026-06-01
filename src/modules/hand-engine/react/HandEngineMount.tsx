"use client";

import type { ReactNode } from "react";
import { HandEngineViewport } from "./components/HandEngineViewport";
import { HandOverlay } from "./components/HandOverlay";

export type HandEngineMountProps = {
  children?: ReactNode;
  /** Hand overlay (2D fingertips). Off in lobby so only the video pipeline runs. */
  showOverlay?: boolean;
};

/** Full viewport: video stage + optional hand overlay + child layers. */
export function HandEngineMount({ children, showOverlay = true }: HandEngineMountProps) {
  return (
    <HandEngineViewport>
      {children}
      {showOverlay && <HandOverlay />}
    </HandEngineViewport>
  );
}
