"use client";

import { useEffect, useState } from "react";
import { useGameSession, usePhaseRuntime } from "@/game/react";
import styles from "./SilverMazeColorHud.module.css";

/** Matches SPHERE_HINT_AFTER_SEC in SilverMazeEnvironment. */
const HAND_HINT_AFTER_MS = 60_000;

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function SilverMazeColorHud() {
  const runtime = usePhaseRuntime();
  const { phaseStartedAt } = useGameSession();
  const [now, setNow] = useState(() => performance.now());
  const colors = runtime.mazeSphereColors;

  useEffect(() => {
    if (phaseStartedAt === null) return;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [phaseStartedAt]);

  if (!colors?.length) {
    return null;
  }

  const elapsedMs = phaseStartedAt !== null ? now - phaseStartedAt : 0;
  const showHint =
    elapsedMs >= HAND_HINT_AFTER_MS && !runtime.mazeAnySpherePainted;

  return (
    <div
      className={`${styles.root} ${showHint ? "" : styles.rootCompact}`}
      aria-label="Maze sphere colors"
    >
      <div className={styles.dots} aria-hidden>
        {colors.map((color, index) => (
          <span
            key={index}
            className={styles.dot}
            style={{ ["--dot-color" as string]: hexColor(color), backgroundColor: hexColor(color) }}
            title={`Sphere ${index + 1}`}
          />
        ))}
      </div>
      {showHint ? (
        <p className={styles.hint}>use your hands to change the stars colors</p>
      ) : null}
    </div>
  );
}
