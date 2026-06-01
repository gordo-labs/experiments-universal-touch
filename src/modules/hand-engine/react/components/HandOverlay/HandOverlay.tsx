"use client";

import { useEffect, useRef } from "react";
import { HandLandmarker } from "@mediapipe/tasks-vision";
import { useCamera } from "../../contexts/CameraContext";
import { useHandTracking } from "../../contexts/HandTrackingContext";
import { useFingersStore } from "../../contexts/FingersContext";
import { FINGER_COLORS, FINGER_NAMES } from "../../../core/constants";
import styles from "./HandOverlay.module.css";

type HandOverlayProps = {
  /** Pin canvas over the 3D stage inside PlayUiLayer (above maze). */
  fullViewport?: boolean;
  /** When false the canvas stays mounted but clears (keeps RAF stable). */
  visible?: boolean;
  /** Game-specific overlay style. */
  variant?: "full" | "index-only" | "right-index-only";
  /** `screen` aligns with the Three.js canvas; `mirrored` matches the selfie video. */
  coordSpace?: "mirrored" | "screen";
};

/** 2D skeleton + fingertip halos — same wiring as camera_ar overlay canvas. */
export function HandOverlay({
  fullViewport = false,
  visible = true,
  variant = "full",
  coordSpace = "mirrored",
}: HandOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stageRef, stageSize } = useCamera();
  const { latestResultRef } = useHandTracking();
  const fingerStore = useFingersStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const stage = stageRef.current;
      const cssW = stageSize.width || stage?.clientWidth || 0;
      const cssH = stageSize.height || stage?.clientHeight || 0;
      if (cssW < 2 || cssH < 2) return;

      if (fullViewport && stage) {
        const rect = stage.getBoundingClientRect();
        canvas.style.position = "fixed";
        canvas.style.left = `${rect.left}px`;
        canvas.style.top = `${rect.top}px`;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.style.pointerEvents = "none";
      }

      const dpr = Math.min(window.devicePixelRatio, 2);
      const bufW = Math.round(cssW * dpr);
      const bufH = Math.round(cssH * dpr);

      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width = bufW;
        canvas.height = bufH;
        canvas.style.width = `${Math.round(cssW)}px`;
        canvas.style.height = `${Math.round(cssH)}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      if (!visible) return;

      const result = latestResultRef.current;
      if (!result?.landmarks?.length) return;

      const frame = fingerStore.ref.current;

      const drawIndexOnly = (side: "left" | "right") => {
        const tip = frame[side].tips.index;
        const point = coordSpace === "screen" ? tip.screen : tip.mirrored;
        if (!tip.visible || !point) return;

        const x = point.x * cssW;
        const y = point.y * cssH;
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      if (variant === "index-only" || variant === "right-index-only") {
        if (variant === "index-only") drawIndexOnly("left");
        drawIndexOnly("right");
        return;
      }

      const drawHand = (
        landmarks: (typeof result.landmarks)[number],
        stroke: string,
        fill: string,
        side: "left" | "right",
      ) => {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.6;
        ctx.lineJoin = "round";

        for (const conn of HandLandmarker.HAND_CONNECTIONS) {
          const a = landmarks[conn.start];
          const b = landmarks[conn.end];
          if (!a || !b) continue;
          ctx.beginPath();
          ctx.moveTo((1 - a.x) * cssW, a.y * cssH);
          ctx.lineTo((1 - b.x) * cssW, b.y * cssH);
          ctx.stroke();
        }

        ctx.fillStyle = fill;
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc((1 - lm.x) * cssW, lm.y * cssH, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const name of FINGER_NAMES) {
          const tip = frame[side].tips[name];
          if (!tip.visible || !tip.mirrored) continue;
          const colorHex = FINGER_COLORS[name].toString(16).padStart(6, "0");
          ctx.strokeStyle = `#${colorHex}`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(
            tip.mirrored.x * cssW,
            tip.mirrored.y * cssH,
            10,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      };

      for (let i = 0; i < result.landmarks.length; i++) {
        const cat = result.handedness?.[i]?.[0]?.categoryName;
        const lm = result.landmarks[i];
        if (cat === "Left") {
          drawHand(lm, "rgba(34,211,238,0.85)", "rgba(34,211,238,0.95)", "left");
        } else if (cat === "Right") {
          drawHand(lm, "rgba(244,114,182,0.85)", "rgba(244,114,182,0.95)", "right");
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    latestResultRef,
    fingerStore,
    stageRef,
    stageSize.width,
    stageSize.height,
    fullViewport,
    visible,
    variant,
    coordSpace,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={fullViewport ? styles.overlayFull : styles.overlay}
      aria-hidden
    />
  );
}
