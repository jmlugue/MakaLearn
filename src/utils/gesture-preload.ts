"use client";

import { loadGestureHandTracker } from "@/utils/gesture-hand-tracker";
import { preloadMakaLearnGestureModel } from "@/utils/gesture-model";

let gesturePreloadPromise: Promise<void> | null = null;

export function preloadGestureRecognitionAssets() {
  if (!gesturePreloadPromise) {
    gesturePreloadPromise = Promise.all([
      loadGestureHandTracker(),
      preloadMakaLearnGestureModel()
    ]).then(() => undefined);
  }

  return gesturePreloadPromise;
}

