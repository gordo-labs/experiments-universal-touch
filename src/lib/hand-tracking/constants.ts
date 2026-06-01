/** MediaPipe Hand Landmarker — pinned version (matches camera_ar). */
export const MEDIAPIPE_VERSION = "0.10.35";
export const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

/** MediaPipe landmark indices for fingertip joints. */
export const FINGER_LANDMARKS = {
  thumb: 4,
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
  wrist: 0,
} as const;

export const FINGER_NAMES = [
  "thumb",
  "index",
  "middle",
  "ring",
  "pinky",
] as const;

/** World projection defaults (tuned in camera_ar). */
export const LANDMARK_DEPTH = -0.05;
export const HAND_DEPTH_SCALE = 0.32;

/** Touch detection between symmetric fingertips (world units). */
export const TOUCH_ON_THRESHOLD = 0.05;
export const TOUCH_OFF_THRESHOLD = 0.1;
export const TOGGLE_COOLDOWN_MS = 280;

/** Inference throttle — 30 Hz is enough for finger UX. */
export const DETECT_INTERVAL_MS = 33;

export const HAND_LANDMARKER_OPTIONS = {
  runningMode: "VIDEO" as const,
  numHands: 2,
  minHandDetectionConfidence: 0.55,
  minHandPresenceConfidence: 0.55,
  minTrackingConfidence: 0.55,
};

/** Per-finger accent colors (HUD + future 3D effects). */
export const FINGER_COLORS: Record<(typeof FINGER_NAMES)[number], number> = {
  thumb: 0xff5566,
  index: 0x66ccff,
  middle: 0x80ff90,
  ring: 0xff90ff,
  pinky: 0xffe066,
};
