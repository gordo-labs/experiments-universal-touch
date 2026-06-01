"use client";

import { useEffect, type ReactNode } from "react";
import { useCamera } from "../../contexts/CameraContext";
import { useScene } from "../../contexts/SceneContext";
import styles from "./HandEngineViewport.module.css";

type HandEngineViewportProps = {
  children?: ReactNode;
};

/** Video feed (always running for MediaPipe) + blackout + child layers inside one box. */
export function HandEngineViewport({ children }: HandEngineViewportProps) {
  const {
    outerRef,
    videoRef,
    stageRef,
    stream,
    showCameraPreview,
    setStageSize,
    setStatus,
  } = useCamera();
  const { setAspect } = useScene();

  useEffect(() => {
    if (!stream?.active) return;

    let cancelled = false;
    let pollId = 0;

    const bindVideo = async () => {
      const video = videoRef.current;
      if (!video || cancelled) return false;

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.playsInline = true;

      try {
        if (video.paused) await video.play();
        if (!cancelled) setStatus("ready");
      } catch (err) {
        const isAbort =
          err instanceof DOMException &&
          (err.name === "AbortError" || err.message?.includes("interrupted"));
        if (!isAbort && !cancelled) {
          setStatus(
            "error",
            err instanceof Error ? err.message : "Video play failed",
          );
        }
      }
      return true;
    };

    void bindVideo().then((ok) => {
      if (!ok && !cancelled) {
        pollId = window.setInterval(() => {
          void bindVideo().then((ready) => {
            if (ready) window.clearInterval(pollId);
          });
        }, 50);
      }
    });

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
    };
  }, [stream, videoRef, setStatus]);

  useEffect(() => {
    const outer = outerRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!outer || !stage || !video) return;

    const layout = () => {
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const ar = vw / Math.max(vh, 1);

      const maxW = outer.clientWidth;
      const maxH = outer.clientHeight;

      let w: number;
      let h: number;
      if (maxW / maxH > ar) {
        h = maxH;
        w = h * ar;
      } else {
        w = maxW;
        h = w / ar;
      }

      stage.style.width = `${Math.round(w)}px`;
      stage.style.height = `${Math.round(h)}px`;
      setStageSize({ width: w, height: h });
      setAspect(w / Math.max(h, 1));
    };

    video.addEventListener("loadedmetadata", layout);
    video.addEventListener("loadeddata", layout);
    layout();

    const ro = new ResizeObserver(layout);
    ro.observe(outer);
    window.addEventListener("resize", layout);

    return () => {
      video.removeEventListener("loadedmetadata", layout);
      video.removeEventListener("loadeddata", layout);
      window.removeEventListener("resize", layout);
      ro.disconnect();
    };
  }, [outerRef, stageRef, videoRef, setStageSize, setAspect, stream]);

  return (
    <div className={styles.stage} ref={stageRef}>
      <video
        ref={videoRef}
        className={styles.video}
        muted
        playsInline
        autoPlay
        aria-hidden
      />
      {!showCameraPreview && <div className={styles.blackout} aria-hidden />}
      {children}
    </div>
  );
}
