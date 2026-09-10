import type { DemoFinger, DemoGesturePrediction, HandLandmarkPoint } from "@/utils/gesture-prediction";

type EatToiletSafetyResult = {
  prediction: DemoGesturePrediction | null;
  feedback?: string;
};

const EAT_LABEL = "I want to eat food";
const TOILET_LABEL = "I want to go to toilet";

const fingerJoints: Record<DemoFinger, { base: number; middle: number; tip: number; ratio: number }> = {
  Thumb: { base: 2, middle: 3, tip: 4, ratio: 1.08 },
  Index: { base: 5, middle: 6, tip: 8, ratio: 1.14 },
  Middle: { base: 9, middle: 10, tip: 12, ratio: 1.14 },
  Ring: { base: 13, middle: 14, tip: 16, ratio: 1.14 },
  Pinky: { base: 17, middle: 18, tip: 20, ratio: 1.12 }
};

const fingerOrder: DemoFinger[] = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

export function applyEatToiletFingerSafety(
  prediction: DemoGesturePrediction | null,
  capturedHandFrames: HandLandmarkPoint[][][]
): EatToiletSafetyResult {
  if (!prediction || (prediction.label !== EAT_LABEL && prediction.label !== TOILET_LABEL)) {
    return { prediction };
  }

  const shape = summarizeEatToiletShape(capturedHandFrames);
  if (shape.usableFrames < 6) return { prediction };

  if (prediction.label === EAT_LABEL && shape.toiletRatio >= 0.45 && shape.eatRatio < 0.45) {
    return {
      prediction: {
        ...prediction,
        label: TOILET_LABEL,
        pose: "Middle-finger toilet shape",
        matchPercent: Math.max(55, prediction.matchPercent - 5)
      },
      feedback: "The motion looked similar to eating, but the middle-finger shape matched toilet."
    };
  }

  if (prediction.label === TOILET_LABEL && shape.eatRatio >= 0.55 && shape.toiletRatio < 0.35) {
    return {
      prediction: {
        ...prediction,
        label: EAT_LABEL,
        pose: "Grouped eating hand shape",
        matchPercent: Math.max(55, prediction.matchPercent - 5)
      },
      feedback: "The motion looked similar to toilet, but the grouped hand shape matched eating."
    };
  }

  if (
    (prediction.label === EAT_LABEL && shape.toiletRatio >= 0.35 && shape.eatRatio >= 0.35) ||
    (prediction.label === TOILET_LABEL && shape.toiletRatio >= 0.35 && shape.eatRatio >= 0.35)
  ) {
    return {
      prediction: null,
      feedback: "That looked close to both eat and toilet. Try again with the finger shape clearer."
    };
  }

  return { prediction };
}

function summarizeEatToiletShape(capturedHandFrames: HandLandmarkPoint[][][]) {
  let usableFrames = 0;
  let toiletLikeFrames = 0;
  let eatLikeFrames = 0;

  capturedHandFrames.forEach((hands) => {
    const primaryHand = hands.find((hand) => hand.length >= 21);
    if (!primaryHand) return;

    usableFrames += 1;
    const extended = getExtendedFingers(primaryHand);
    const nonThumbFingers = extended.filter((finger) => finger !== "Thumb");

    const hasOnlyMiddleFinger =
      nonThumbFingers.length === 1 && nonThumbFingers[0] === "Middle";
    const hasGroupedEatingShape = nonThumbFingers.length >= 3;

    if (hasOnlyMiddleFinger) toiletLikeFrames += 1;
    if (hasGroupedEatingShape) eatLikeFrames += 1;
  });

  return {
    usableFrames,
    toiletRatio: usableFrames ? toiletLikeFrames / usableFrames : 0,
    eatRatio: usableFrames ? eatLikeFrames / usableFrames : 0
  };
}

function getExtendedFingers(landmarks: HandLandmarkPoint[]) {
  const wrist = landmarks[0];
  return fingerOrder.filter((finger) => {
    const joints = fingerJoints[finger];
    const base = landmarks[joints.base];
    const middle = landmarks[joints.middle];
    const tip = landmarks[joints.tip];
    if (!wrist || !base || !middle || !tip) return false;

    const straightness = angleDegrees(base, middle, tip);
    const reachRatio = distance(wrist, tip) / Math.max(distance(wrist, middle), 0.001);
    return straightness > 145 && reachRatio > joints.ratio;
  });
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
