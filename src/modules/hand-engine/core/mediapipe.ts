import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { HAND_LANDMARKER_OPTIONS, MODEL_URL, WASM_URL } from "./constants";

export type HandLandmarkerHandle = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => HandLandmarkerResult;
  close: () => void;
};

async function createLandmarker(delegate: "GPU" | "CPU") {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate,
    },
    ...HAND_LANDMARKER_OPTIONS,
  });
}

export async function createHandLandmarker(): Promise<HandLandmarkerHandle> {
  let landmarker: HandLandmarker;
  try {
    landmarker = await createLandmarker("GPU");
  } catch (gpuError) {
    console.warn("HandLandmarker GPU delegate failed, falling back to CPU", gpuError);
    landmarker = await createLandmarker("CPU");
  }

  return {
    detectForVideo: (video, timestamp) => landmarker.detectForVideo(video, timestamp),
    close: () => landmarker.close(),
  };
}
