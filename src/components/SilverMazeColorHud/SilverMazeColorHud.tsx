"use client";

import { usePhaseRuntime } from "@/game/react";
import styles from "./SilverMazeColorHud.module.css";

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function SilverMazeColorHud() {
  const runtime = usePhaseRuntime();
  const colors = runtime.mazeSphereColors;

  if (!colors?.length) {
    return null;
  }

  return (
    <div className={styles.root} aria-label="Maze sphere colors">
      {colors.map((color, index) => (
        <span
          key={index}
          className={styles.dot}
          style={{ ["--dot-color" as string]: hexColor(color), backgroundColor: hexColor(color) }}
          title={`Sphere ${index + 1}`}
        />
      ))}
    </div>
  );
}
