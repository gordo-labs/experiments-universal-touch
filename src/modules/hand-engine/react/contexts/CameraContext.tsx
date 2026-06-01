"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { CameraStatus } from "../../core/types";

export type StageSize = { width: number; height: number };

type CameraContextValue = {
  status: CameraStatus;
  error: string | null;
  outerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  stageSize: StageSize;
  stream: MediaStream | null;
  showCameraPreview: boolean;
  setShowCameraPreview: (value: boolean) => void;
  setStageSize: (size: StageSize) => void;
  setStatus: (status: CameraStatus, error?: string | null) => void;
};

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatusState] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  const setStatus = useCallback((next: CameraStatus, err: string | null = null) => {
    setStatusState(next);
    setError(err);
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      setStatus("requesting");
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(activeStream);
      } catch (e) {
        if (!cancelled) {
          setStatus(
            "error",
            e instanceof Error ? e.message : "Camera permission denied",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [setStatus]);

  const value = useMemo<CameraContextValue>(
    () => ({
      status,
      error,
      outerRef,
      videoRef,
      stageRef,
      stageSize,
      stream,
      showCameraPreview,
      setShowCameraPreview,
      setStageSize,
      setStatus,
    }),
    [status, error, stageSize, stream, showCameraPreview, setStatus],
  );

  return (
    <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
  );
}

export function useCamera() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCamera must be used within CameraProvider");
  return ctx;
}
