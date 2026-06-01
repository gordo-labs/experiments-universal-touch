import type { HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  FINGER_LANDMARKS,
  FINGER_NAMES,
  HAND_DEPTH_SCALE,
  LANDMARK_DEPTH,
} from "./constants";
import type {
  FingerName,
  FingerTip,
  FingersFrame,
  HandFingers,
  HandSide,
  ScreenPoint,
  ViewArea,
  WorldPoint,
} from "./types";

/** lm → world coords proportional to visible 3D area, mirrored on X (selfie). */
export function landmarkToWorld(
  lm: NormalizedLandmark,
  view: ViewArea,
  out?: { x: number; y: number; z: number },
): WorldPoint {
  const point = out ?? { x: 0, y: 0, z: 0 };
  point.x = (0.5 - lm.x) * view.widthAt;
  point.y = (0.5 - lm.y) * view.heightAt;
  point.z = LANDMARK_DEPTH + lm.z * HAND_DEPTH_SCALE;
  return point;
}

export function landmarkToScreen(lm: NormalizedLandmark): ScreenPoint {
  return { x: lm.x, y: lm.y };
}

export function landmarkToMirrored(lm: NormalizedLandmark): ScreenPoint {
  return { x: 1 - lm.x, y: lm.y };
}

export function landmarkToPixel(
  lm: NormalizedLandmark,
  stageWidth: number,
  stageHeight: number,
  mirror = true,
): { x: number; y: number } {
  const x = mirror ? 1 - lm.x : lm.x;
  return { x: x * stageWidth, y: lm.y * stageHeight };
}

/** First landmark set tagged Left / Right (ignores duplicate sides). */
export function pickLeftRightHands(result: HandLandmarkerResult | undefined): {
  left: NormalizedLandmark[] | null;
  right: NormalizedLandmark[] | null;
  leftIndex: number;
  rightIndex: number;
} {
  if (!result?.landmarks?.length) {
    return { left: null, right: null, leftIndex: -1, rightIndex: -1 };
  }

  let left: NormalizedLandmark[] | null = null;
  let right: NormalizedLandmark[] | null = null;
  let leftIndex = -1;
  let rightIndex = -1;

  for (let i = 0; i < result.landmarks.length; i++) {
    const cat = result.handedness?.[i]?.[0]?.categoryName;
    if (cat === "Left" && !left) {
      left = result.landmarks[i];
      leftIndex = i;
    } else if (cat === "Right" && !right) {
      right = result.landmarks[i];
      rightIndex = i;
    }
  }

  return { left, right, leftIndex, rightIndex };
}

function emptyHand(side: HandSide): HandFingers {
  const tips = {} as Record<FingerName, FingerTip>;
  for (const name of FINGER_NAMES) {
    tips[name] = {
      name,
      landmarkIndex: FINGER_LANDMARKS[name],
      visible: false,
      screen: null,
      mirrored: null,
      pixel: null,
      world: null,
    };
  }
  return { side, detected: false, confidence: 0, wrist: null, tips };
}

function buildHandFingers(
  side: HandSide,
  landmarks: NormalizedLandmark[] | null,
  handednessScore: number,
  stageWidth: number,
  stageHeight: number,
  view: ViewArea | null,
): HandFingers {
  const hand = emptyHand(side);
  if (!landmarks?.length) return hand;

  hand.detected = true;
  hand.confidence = handednessScore;
  hand.wrist = landmarkToMirrored(landmarks[FINGER_LANDMARKS.wrist]);

  for (const name of FINGER_NAMES) {
    const idx = FINGER_LANDMARKS[name];
    const lm = landmarks[idx];
    if (!lm) continue;

    const tip = hand.tips[name];
    tip.visible = true;
    tip.screen = landmarkToScreen(lm);
    tip.mirrored = landmarkToMirrored(lm);
    tip.pixel =
      stageWidth > 0 && stageHeight > 0
        ? landmarkToPixel(lm, stageWidth, stageHeight, true)
        : null;
    tip.world = view ? landmarkToWorld(lm, view) : null;
  }

  return hand;
}

/** Build the canonical FingersFrame consumed by game systems. */
export function buildFingersFrame(
  result: HandLandmarkerResult | undefined,
  timestamp: number,
  stageWidth: number,
  stageHeight: number,
  view: ViewArea | null,
): FingersFrame {
  const { left, right, leftIndex, rightIndex } = pickLeftRightHands(result);

  const leftScore =
    result?.handedness?.[leftIndex]?.[0]?.score ?? (left ? 1 : 0);
  const rightScore =
    result?.handedness?.[rightIndex]?.[0]?.score ?? (right ? 1 : 0);

  return {
    timestamp,
    stageWidth,
    stageHeight,
    left: buildHandFingers("left", left, leftScore, stageWidth, stageHeight, view),
    right: buildHandFingers("right", right, rightScore, stageWidth, stageHeight, view),
  };
}

/** Distance between symmetric fingertips in world space (m). */
export function symmetricTipDistance(
  frame: FingersFrame,
  finger: FingerName,
): number | null {
  const l = frame.left.tips[finger];
  const r = frame.right.tips[finger];
  if (!l.visible || !r.visible || !l.world || !r.world) return null;

  const dx = l.world.x - r.world.x;
  const dy = l.world.y - r.world.y;
  const dz = l.world.z - r.world.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
