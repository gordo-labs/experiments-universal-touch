import type { FINGER_NAMES } from "./constants";

export type HandSide = "left" | "right";
export type FingerName = (typeof FINGER_NAMES)[number];

/** Normalized screen coords (0–1). `mirrored` matches selfie preview (scaleX -1). */
export type ScreenPoint = { x: number; y: number };

export type PixelPoint = { x: number; y: number };

export type WorldPoint = { x: number; y: number; z: number };

export type FingerTip = {
  name: FingerName;
  landmarkIndex: number;
  visible: boolean;
  screen: ScreenPoint | null;
  mirrored: ScreenPoint | null;
  pixel: PixelPoint | null;
  world: WorldPoint | null;
};

export type HandFingers = {
  side: HandSide;
  detected: boolean;
  confidence: number;
  wrist: ScreenPoint | null;
  tips: Record<FingerName, FingerTip>;
};

/** Single frame of fingertip state — primary input for game environments. */
export type FingersFrame = {
  timestamp: number;
  stageWidth: number;
  stageHeight: number;
  left: HandFingers;
  right: HandFingers;
};

export type ViewArea = {
  widthAt: number;
  heightAt: number;
};

export type CameraStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "error";

export type HandTrackingStatus =
  | "idle"
  | "loading-model"
  | "ready"
  | "error";

/** Session lifecycle — separate from the four puzzle phases. */
export type SessionStatus = "lobby" | "playing" | "paused" | "ended";

/** @deprecated Use SessionStatus */
export type GamePhase = SessionStatus;
