"use client";

import { useState } from "react";
import { PhaseHud } from "@/components/PhaseHud";
import styles from "./PlayControllerHud.module.css";

export function PlayControllerHud() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.toggle} ${open ? styles.toggleOn : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="play-controller-panel"
      >
        Controls
      </button>
      {open ? (
        <div id="play-controller-panel" className={styles.panel}>
          <PhaseHud />
        </div>
      ) : null}
    </div>
  );
}
