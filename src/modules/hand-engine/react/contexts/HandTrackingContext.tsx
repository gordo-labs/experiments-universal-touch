"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { DETECT_INTERVAL_MS } from "../../core/constants";
import { createHandLandmarker } from "../../core/mediapipe";
import type { HandTrackingStatus } from "../../core/types";
import { useCamera } from "./CameraContext";

type HandTrackingContextValue = {
  status: HandTrackingStatus;
  error: string | null;
  latestResultRef: React.RefObject<HandLandmarkerResult | undefined>;
  frameTimestampRef: React.RefObject<number>;
};

const HandTrackingContext = createContext<HandTrackingContextValue | null>(null);

export function HandTrackingProvider({ children }: { children: ReactNode }) {
  const { videoRef, stream } = useCamera();
  const [status, setStatus] = useState<HandTrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const latestResultRef = useRef<HandLandmarkerResult | undefined>(undefined);
  const frameTimestampRef = useRef(0);
  const landmarkerRef = useRef<Awaited<ReturnType<typeof createHandLandmarker>> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setStatus("loading-model");
      try {
        const landmarker = await createHandLandmarker();
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Could not load hand model");
      }
    }

    void boot();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !stream?.active) return;

    let raf = 0;
    let lastDetectMs = -Infinity;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (
        !landmarker ||
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        now - lastDetectMs <= DETECT_INTERVAL_MS
      ) {
        return;
      }

      lastDetectMs = now;
      try {
        latestResultRef.current = landmarker.detectForVideo(video, now);
        frameTimestampRef.current = now;
      } catch (e) {
        console.error("HandLandmarker detectForVideo failed", e);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, stream, videoRef]);

  const value = useMemo<HandTrackingContextValue>(
    () => ({ status, error, latestResultRef, frameTimestampRef }),
    [status, error],
  );

  return (
    <HandTrackingContext.Provider value={value}>
      {children}
    </HandTrackingContext.Provider>
  );
}

export function useHandTracking() {
  const ctx = useContext(HandTrackingContext);
  if (!ctx) throw new Error("useHandTracking must be used within HandTrackingProvider");
  return ctx;
}
