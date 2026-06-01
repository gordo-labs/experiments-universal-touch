"use client";

import { useEffect, useRef } from "react";
import styles from "./ConfettiLayer.module.css";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  twinkle: number;
  twinkleSpeed: number;
};

/** Tron / stellar palette — reads as starfield, not party confetti. */
const STAR_COLORS = [
  "#5ce8ff",
  "#9ef6ff",
  "#e8f4ff",
  "#ffffff",
  "#7adfff",
  "#b8c8ff",
  "#5ce8ff",
];

function spawn(width: number, height: number, burst = false): Particle[] {
  const count = burst ? 140 : 100;
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: burst ? -20 - Math.random() * height * 0.4 : -20 - Math.random() * 80,
    vx: (Math.random() - 0.5) * (burst ? 4 : 2.5),
    vy: 1.2 + Math.random() * (burst ? 4.5 : 3.2),
    size: 1.5 + Math.random() * 3.5,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    twinkle: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.04 + Math.random() * 0.06,
  }));
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  if (size > 2.2) {
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function ConfettiLayer({ active }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles = spawn(window.innerWidth, window.innerHeight, true);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgb(92 232 255 / 0.55)";

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.twinkle += p.twinkleSpeed;
        const alpha = 0.55 + Math.sin(p.twinkle) * 0.35;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = p.color;
        drawStar(ctx, p.size, p.color, alpha);
        ctx.restore();
      }

      ctx.shadowBlur = 0;
      particles = particles.filter((p) => p.y < canvas.height + 40);
      if (particles.length < 90) {
        particles.push(...spawn(canvas.width, canvas.height).slice(0, 14));
      }
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />;
}
