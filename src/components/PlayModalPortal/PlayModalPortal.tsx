"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./PlayModalPortal.module.css";

type PlayModalPortalProps = {
  open: boolean;
  children: ReactNode;
};

/** Full-viewport modal host — escapes PlayUiLayer stacking / pointer-events quirks. */
export function PlayModalPortal({ open, children }: PlayModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        /* ignore */
      }
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.root} data-play-modal="">
      {children}
    </div>,
    document.body,
  );
}
