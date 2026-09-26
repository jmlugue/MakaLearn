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

export const expectedGestureHandCounts: Record<string, 1 | 2> = {
  "I want to drink": 1,
  "I want to eat": 1,
  Help: 2,
  No: 1,
  "Sit down": 2,
  "I want to go to toilet": 1,
  Yes: 1
};

export function getExpectedGestureHandCount(label: string): 1 | 2 | null {
  const trimmed = label.trim();
  if (trimmed in expectedGestureHandCounts) return expectedGestureHandCounts[trimmed];
  if (/help/i.test(trimmed)) return 2;
  if (/sit/i.test(trimmed)) return 2;
  if (/toilet|\beat(?: food)?\b|drink(?: water)?|yes|no/i.test(trimmed)) return 1;
  return null;
}
