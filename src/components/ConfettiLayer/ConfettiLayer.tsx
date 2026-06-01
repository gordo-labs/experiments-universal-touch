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
  rot: number;
  vr: number;
};

const COLORS = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#fb923c", "#c084fc"];

function spawn(width: number): Particle[] {
  return Array.from({ length: 120 }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 80,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 5,
    size: 4 + Math.random() * 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
  }));
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
    let particles = spawn(window.innerWidth);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      particles = particles.filter((p) => p.y < canvas.height + 40);
      if (particles.length < 80) particles.push(...spawn(canvas.width).slice(0, 12));
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
