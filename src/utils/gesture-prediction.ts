export type HandLandmarkPoint = {
  x: number;
  y: number;
  z: number;
};

export type DemoFinger = "Thumb" | "Index" | "Middle" | "Ring" | "Pinky";

export type DemoGesturePrediction = {
  label: string;
  pose: string;
  fingers: DemoFinger[];
  handCount: 1 | 2;
  matchPercent: number;
};
