export type HandLandmarkPoint = {
  x: number;
  y: number;
  z: number;
};

export type DemoFinger = "Thumb" | "Index" | "Middle" | "Ring" | "Pinky";

export type SupportedGesturePrediction = {
  label: string;
  handCount: 1 | 2;
  fingers: DemoFinger[];
  pose: string;
  ignoreThumb?: boolean;
};

// These deliberately simple poses are demo mappings, not official Makaton gestures.
// Replace this rule table with predictions from a trained and approved gesture model.
export const supportedGesturePredictions: SupportedGesturePrediction[] = [
  { label: "I want to eat food", handCount: 1, fingers: ["Pinky"], pose: "Raise only your pinky" },
  { label: "I want to go to toilet", handCount: 1, fingers: ["Index"], pose: "Raise only your index finger" },
  {
    label: "I want to drink water",
    handCount: 2,
    fingers: ["Index", "Middle", "Ring", "Pinky"],
    pose: "Show two open hands",
    ignoreThumb: true
  },
  { label: "Yes", handCount: 1, fingers: ["Index", "Pinky"], pose: "Raise your index finger and pinky" },
  {
    label: "Help",
    handCount: 1,
    fingers: ["Index", "Middle", "Ring", "Pinky"],
    pose: "Open four fingers with the thumb tucked"
  },
  {
    label: "Sit down",
    handCount: 1,
    fingers: ["Thumb", "Index", "Middle", "Ring", "Pinky"],
    pose: "Show an open hand"
  },
  { label: "No", handCount: 1, fingers: [], pose: "Show a closed fist" }
];

export type DemoGesturePrediction = {
  label: string;
  pose: string;
  fingers: DemoFinger[];
  handCount: 1 | 2;
  matchPercent: number;
};

const fingerJoints: Record<DemoFinger, { base: number; middle: number; tip: number; ratio: number }> = {
  Thumb: { base: 2, middle: 3, tip: 4, ratio: 1.08 },
  Index: { base: 5, middle: 6, tip: 8, ratio: 1.14 },
  Middle: { base: 9, middle: 10, tip: 12, ratio: 1.14 },
  Ring: { base: 13, middle: 14, tip: 16, ratio: 1.14 },
  Pinky: { base: 17, middle: 18, tip: 20, ratio: 1.12 }
};

const fingerOrder: DemoFinger[] = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

/**
 * Produces a sample prediction from MediaPipe hand landmarks.
 * This is intentionally rule-based so the UI can demonstrate recognition before
 * an approved, trained gesture-recognition model and dataset are integrated.
 */
export function predictGesturePlaceholder(hands: HandLandmarkPoint[][]): DemoGesturePrediction | null {
  if ((hands.length !== 1 && hands.length !== 2) || hands.some((landmarks) => landmarks.length < 21)) return null;

  const extendedByHand = hands.map(getExtendedFingers);
  const match = supportedGesturePredictions.find(
    (gesture) =>
      gesture.handCount === hands.length &&
      extendedByHand.every((extended) => {
        const fingersToCompare = gesture.ignoreThumb
          ? extended.filter((finger) => finger !== "Thumb")
          : extended;
        return fingerSignature(fingersToCompare) === fingerSignature(gesture.fingers);
      })
  );

  if (!match) return null;

  return {
    label: match.label,
    pose: match.pose,
    fingers: extendedByHand[0],
    handCount: match.handCount,
    // A rule match percentage, not statistical model confidence.
    matchPercent: match.handCount === 2 ? 90 : extendedByHand[0].length === 0 ? 82 : 88
  };
}

function getExtendedFingers(landmarks: HandLandmarkPoint[]) {
  const wrist = landmarks[0];
  return fingerOrder.filter((finger) => {
    const joints = fingerJoints[finger];
    const base = landmarks[joints.base];
    const middle = landmarks[joints.middle];
    const tip = landmarks[joints.tip];
    const straightness = angleDegrees(base, middle, tip);
    const reachRatio = distance(wrist, tip) / Math.max(distance(wrist, middle), 0.001);
    return straightness > 145 && reachRatio > joints.ratio;
  });
}

function fingerSignature(fingers: DemoFinger[]) {
  return [...fingers].sort().join("|");
}

function distance(a: HandLandmarkPoint, b: HandLandmarkPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function angleDegrees(a: HandLandmarkPoint, vertex: HandLandmarkPoint, c: HandLandmarkPoint) {
  const first = { x: a.x - vertex.x, y: a.y - vertex.y, z: a.z - vertex.z };
  const second = { x: c.x - vertex.x, y: c.y - vertex.y, z: c.z - vertex.z };
  const dot = first.x * second.x + first.y * second.y + first.z * second.z;
  const magnitude = Math.hypot(first.x, first.y, first.z) * Math.hypot(second.x, second.y, second.z);
  const cosine = Math.min(1, Math.max(-1, dot / Math.max(magnitude, 0.001)));
  return (Math.acos(cosine) * 180) / Math.PI;
}
