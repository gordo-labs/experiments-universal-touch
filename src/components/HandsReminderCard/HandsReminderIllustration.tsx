"use client";

import styles from "./HandsReminderIllustration.module.css";

/** MediaPipe hand topology — same graph as the live overlay. */
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

/** Open palm facing the camera — left hand (screen-left). */
const LEFT_OPEN_PALM: [number, number][] = [
  [64, 122], // 0 wrist
  [46, 112], // 1 thumb cmc
  [38, 100], // 2
  [32, 86], // 3
  [28, 70], // 4 tip
  [56, 108], // 5 index mcp
  [52, 86], // 6 pip
  [50, 64], // 7 dip
  [48, 42], // 8 tip
  [68, 106], // 9 middle mcp
  [68, 82], // 10
  [68, 58], // 11
  [68, 34], // 12 tip
  [80, 108], // 13 ring mcp
  [84, 84], // 14
  [88, 62], // 15
  [90, 44], // 16 tip
  [92, 112], // 17 pinky mcp
  [98, 92], // 18
  [102, 74], // 19
  [104, 58], // 20 tip
];

const FINGERTIPS = [4, 8, 12, 16, 20] as const;

function mirrorHand(centerX: number, points: [number, number][]): [number, number][] {
  return points.map(([x, y]) => [centerX * 2 - x, y]);
}

function toPath(points: [number, number][], indices: number[]): string {
  const first = points[indices[0]];
  if (!first) return "";
  let d = `M ${first[0]} ${first[1]}`;
  for (let i = 1; i < indices.length; i += 1) {
    const p = points[indices[i]];
    if (p) d += ` L ${p[0]} ${p[1]}`;
  }
  return `${d} Z`;
}

type WireHandProps = {
  points: [number, number][];
  className?: string;
  palmPath: string;
};

function WireHand({ points, className, palmPath }: WireHandProps) {
  return (
    <g className={className}>
      <path d={palmPath} fill="url(#palmFill)" stroke="none" />

      {HAND_CONNECTIONS.map(([a, b], i) => {
        const p1 = points[a];
        const p2 = points[b];
        if (!p1 || !p2) return null;
        return (
          <line
            key={`edge-${i}`}
            x1={p1[0]}
            y1={p1[1]}
            x2={p2[0]}
            y2={p2[1]}
            className={styles.edge}
          />
        );
      })}

      {points.map(([x, y], i) => (
        <circle
          key={`joint-${i}`}
          cx={x}
          cy={y}
          r={FINGERTIPS.includes(i as (typeof FINGERTIPS)[number]) ? 3.2 : 2.1}
          className={
            FINGERTIPS.includes(i as (typeof FINGERTIPS)[number])
              ? styles.tip
              : styles.joint
          }
        />
      ))}

      <path
        d={`M ${points[5]![0]} ${points[5]![1]} Q ${points[0]![0]} ${points[0]![1] - 6} ${points[17]![0]} ${points[17]![1]}`}
        className={styles.palmArc}
      />
      <path
        d={`M ${points[2]![0]} ${points[2]![1]} Q ${points[9]![0]} ${points[9]![1] - 8} ${points[13]![0]} ${points[13]![1]}`}
        className={styles.palmArc}
        opacity="0.55"
      />
    </g>
  );
}

/** Two open palms — Tron wireframe style for the pre-game reminder. */
export function HandsReminderIllustration() {
  const rightPalm = mirrorHand(140, LEFT_OPEN_PALM);
  const leftPalmPath = toPath(LEFT_OPEN_PALM, [0, 5, 9, 13, 17]);
  const rightPalmPath = toPath(rightPalm, [0, 5, 9, 13, 17]);

  return (
    <svg
      className={styles.svg}
      viewBox="0 0 280 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <filter id="handsGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="palmFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(92 232 255 / 0.2)" />
          <stop offset="100%" stopColor="rgb(120 100 255 / 0.05)" />
        </linearGradient>
        <radialGradient id="scanGlow" cx="50%" cy="55%" r="45%">
          <stop offset="0%" stopColor="rgb(92 232 255 / 0.14)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="280" height="150" fill="url(#scanGlow)" />

      <g filter="url(#handsGlow)">
        <WireHand
          points={LEFT_OPEN_PALM}
          palmPath={leftPalmPath}
          className={styles.leftHand}
        />
        <WireHand
          points={rightPalm}
          palmPath={rightPalmPath}
          className={styles.rightHand}
        />
      </g>

      <line
        x1="140"
        y1="28"
        x2="140"
        y2="122"
        className={styles.centerLine}
      />
    </svg>
  );
}
