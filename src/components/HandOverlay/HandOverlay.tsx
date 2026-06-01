"use client";

import { useEffect, useRef } from "react";
import { HandLandmarker } from "@mediapipe/tasks-vision";
import { useCamera } from "@/contexts/camera";
import { useHandTracking } from "@/contexts/hand-tracking";
import { useFingersStore } from "@/contexts/fingers";
import { FINGER_COLORS, FINGER_NAMES, OVERLAY_WIRE_FILL, OVERLAY_WIRE_STROKE } from "@/lib/hand-tracking/constants";
import styles from "./HandOverlay.module.css";

/** 2D skeleton + fingertip halos — same wiring as camera_ar overlay canvas. */
export function HandOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { stageRef } = useCamera();
  const { latestResultRef } = useHandTracking();
  const fingerStore = useFingersStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const cssW = stage.clientWidth;
      const cssH = stage.clientHeight;
      if (cssW < 2 || cssH < 2) return;

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

      const result = latestResultRef.current;
      if (!result?.landmarks?.length) return;

      const frame = fingerStore.ref.current;

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
          drawHand(lm, OVERLAY_WIRE_STROKE, OVERLAY_WIRE_FILL, "left");
        } else if (cat === "Right") {
          drawHand(lm, OVERLAY_WIRE_STROKE, OVERLAY_WIRE_FILL, "right");
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [latestResultRef, fingerStore, stageRef]);

  return <canvas ref={canvasRef} className={styles.overlay} aria-hidden />;
}
