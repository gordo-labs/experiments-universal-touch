"use client";

import styles from "./StarMazeDirectionHint.module.css";

type StarMazeDirectionHintProps = {
  className?: string;
};

export function StarMazeDirectionHint({ className }: StarMazeDirectionHintProps) {
  return (
    <svg
      className={className ?? styles.arrow}
      viewBox="0 0 80 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 16H52"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M42 8L56 16L42 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M62 16H72"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}
