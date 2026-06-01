"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useCamera } from "./CameraContext";
import { useHandTracking } from "./HandTrackingContext";
import { useScene } from "./SceneContext";
import { createFrameStore, type FrameStore } from "../../core/frame-store";
import { buildFingersFrame } from "../../core/landmarks";
import { FINGER_NAMES } from "../../core/constants";
import type { FingerName, FingersFrame, HandSide } from "../../core/types";

function createEmptyFrame(): FingersFrame {
  const emptyTips = () =>
    Object.fromEntries(
      FINGER_NAMES.map((name) => [
        name,
        {
          name,
          landmarkIndex: 0,
          visible: false,
          screen: null,
          mirrored: null,
          pixel: null,
          world: null,
        },
      ]),
    ) as FingersFrame["left"]["tips"];

  return {
    timestamp: 0,
    stageWidth: 0,
    stageHeight: 0,
    left: {
      side: "left",
      detected: false,
      confidence: 0,
      wrist: null,
      tips: emptyTips(),
    },
    right: {
      side: "right",
      detected: false,
      confidence: 0,
      wrist: null,
      tips: emptyTips(),
    },
  };
}

type FingersContextValue = {
  store: FrameStore<FingersFrame>;
  /** React-friendly snapshot (~30 Hz). Prefer store.ref in RAF loops. */
  frame: FingersFrame;
  getTip: (side: HandSide, finger: FingerName) => FingersFrame["left"]["tips"][FingerName];
  bothHandsDetected: boolean;
};

const FingersContext = createContext<FingersContextValue | null>(null);

export function FingersProvider({ children }: { children: ReactNode }) {
  const { stageSize } = useCamera();
  const { latestResultRef, frameTimestampRef } = useHandTracking();
  const { viewArea } = useScene();

  const store = useMemo(() => createFrameStore(createEmptyFrame()), []);

  useEffect(() => {
    let raf = 0;
    let lastTs = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const ts = frameTimestampRef.current;
      if (ts === lastTs) return;
      lastTs = ts;

      const frame = buildFingersFrame(
        latestResultRef.current,
        ts,
        stageSize.width,
        stageSize.height,
        viewArea,
      );
      store.set(frame);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [store, latestResultRef, frameTimestampRef, stageSize, viewArea]);

  const frame = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const value = useMemo<FingersContextValue>(
    () => ({
      store,
      frame,
      getTip: (side, finger) => frame[side].tips[finger],
      bothHandsDetected: frame.left.detected && frame.right.detected,
    }),
    [store, frame],
  );

  return (
    <FingersContext.Provider value={value}>{children}</FingersContext.Provider>
  );
}

export function useFingers() {
  const ctx = useContext(FingersContext);
  if (!ctx) throw new Error("useFingers must be used within FingersProvider");
  return ctx;
}

/** Imperative access for Three.js / canvas — no React re-render. */
export function useFingersStore() {
  return useFingers().store;
}
