"use client";

import type { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";

const HAND_DETECTION_CONFIDENCE = 0.7;
const HAND_PRESENCE_CONFIDENCE = 0.7;
const HAND_TRACKING_CONFIDENCE = 0.65;

type VisionTasks = typeof import("@mediapipe/tasks-vision");
type VisionFileset = Awaited<ReturnType<VisionTasks["FilesetResolver"]["forVisionTasks"]>>;

type GestureHandTracker = {
  vision: VisionTasks;
  handLandmarker: HandLandmarker;
  handConnections: typeof HandLandmarker.HAND_CONNECTIONS;
};

let visionPromise: Promise<VisionTasks> | null = null;
let filesetPromise: Promise<VisionFileset> | null = null;
let handTrackerPromise: Promise<GestureHandTracker> | null = null;

function loadVisionTasks() {
  if (!visionPromise) {
    visionPromise = import("@mediapipe/tasks-vision");
  }
  return visionPromise;
}

async function loadVisionFileset() {
  if (!filesetPromise) {
    filesetPromise = loadVisionTasks().then((vision) => vision.FilesetResolver.forVisionTasks("/mediapipe/wasm"));
  }
  return filesetPromise;
}

export async function loadGestureHandTracker() {
  if (!handTrackerPromise) {
    handTrackerPromise = Promise.all([loadVisionTasks(), loadVisionFileset()]).then(async ([vision, fileset]) => {
      const handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
        runningMode: "VIDEO",
        numHands: 2,
        // Keep these thresholds aligned with live capture so preloaded and page-created trackers behave the same.
        minHandDetectionConfidence: HAND_DETECTION_CONFIDENCE,
        minHandPresenceConfidence: HAND_PRESENCE_CONFIDENCE,
        minTrackingConfidence: HAND_TRACKING_CONFIDENCE
      });

      return {
        vision,
        handLandmarker,
        handConnections: vision.HandLandmarker.HAND_CONNECTIONS
      };
    });
  }

  return handTrackerPromise;
}

export function createGestureDrawingUtils(vision: VisionTasks, canvas: HTMLCanvasElement): DrawingUtils {
  return new vision.DrawingUtils(canvas.getContext("2d") as CanvasRenderingContext2D);
}

