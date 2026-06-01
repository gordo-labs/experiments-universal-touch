"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./PlayControlsPortal.module.css";

type PlayControlsPortalProps = {
  children: ReactNode;
};

/** Left-side play controls — portaled above PlayUiLayer / hand overlay. */
export function PlayControlsPortal({ children }: PlayControlsPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.root} data-play-controls="">
      {children}
    </div>,
    document.body,
  );
}
