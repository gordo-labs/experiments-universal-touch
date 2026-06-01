"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { computeViewArea } from "../../core/view-area";
import type { ViewArea } from "../../core/types";

type SceneContextValue = {
  aspect: number;
  viewArea: ViewArea;
  setAspect: (aspect: number) => void;
  /** Register Three.js canvas for future game layers. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspectState] = useState(16 / 9);
  const [sceneReady, setSceneReady] = useState(false);

  const setAspect = useCallback((next: number) => {
    if (next > 0) setAspectState(next);
  }, []);

  const viewArea = useMemo(() => computeViewArea(aspect), [aspect]);

  const value = useMemo<SceneContextValue>(
    () => ({
      aspect,
      viewArea,
      setAspect,
      canvasRef,
      sceneReady,
      setSceneReady,
    }),
    [aspect, viewArea, setAspect, sceneReady],
  );

  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used within SceneProvider");
  return ctx;
}
