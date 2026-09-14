import type { DemoFinger, DemoGesturePrediction, HandLandmarkPoint } from "@/utils/gesture-prediction";
import type { GestureFeedbackIssueCategory } from "@/utils/gesture-feedback";

type EatToiletSafetyResult = {
  prediction: DemoGesturePrediction | null;
  feedbackPrediction?: DemoGesturePrediction;
  feedback?: string;
  issueCategory?: GestureFeedbackIssueCategory;
};

export type CapturedGestureFrame = {
  hands: HandLandmarkPoint[][];
  handedness: Array<"Left" | "Right" | "Unknown">;
};

const EAT_LABEL = "I want to eat food";
const TOILET_LABEL = "I want to go to toilet";
const DRINK_LABEL = "I want to drink water";
const HELP_LABEL = "Help";
const NO_LABEL = "No";
const SIT_LABEL = "Sit down";
const YES_LABEL = "Yes";

const expectedHandCounts: Record<string, 1 | 2> = {
  [DRINK_LABEL]: 1,
  [EAT_LABEL]: 1,
  [HELP_LABEL]: 2,
  [NO_LABEL]: 1,
  [SIT_LABEL]: 1,
  [TOILET_LABEL]: 1,
  [YES_LABEL]: 1
};

const fingerJoints: Record<DemoFinger, { base: number; middle: number; tip: number; ratio: number }> = {
  Thumb: { base: 2, middle: 3, tip: 4, ratio: 1.08 },
  Index: { base: 5, middle: 6, tip: 8, ratio: 1.14 },
  Middle: { base: 9, middle: 10, tip: 12, ratio: 1.14 },
  Ring: { base: 13, middle: 14, tip: 16, ratio: 1.14 },
  Pinky: { base: 17, middle: 18, tip: 20, ratio: 1.12 }
};

const fingerOrder: DemoFinger[] = ["Thumb", "Index", "Middle", "Ring", "Pinky"];

export function applyBasicGesturePredictionGuards(
  prediction: DemoGesturePrediction | null,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  if (!prediction) return { prediction };

  const handCountResult = validateExpectedHandCount(prediction, capturedFrames);
  if (!handCountResult.prediction) return handCountResult;

  if (prediction.label === YES_LABEL) return validateYesClosedFist(prediction, capturedFrames);
  if (prediction.label === NO_LABEL) return validateNoPalmFacing(prediction, capturedFrames);
  if (prediction.label === HELP_LABEL) return validateHelpTwoHandShape(prediction, capturedFrames);
  if (prediction.label === EAT_LABEL) return validateEatPalmNotFacing(prediction, capturedFrames);
  if (prediction.label === DRINK_LABEL) {
    return (
      resolveEatToiletShapePredictedAsDrink(prediction, capturedFrames) ??
      validateDrinkMotionDirection(prediction, capturedFrames)
    );
  }

  return { prediction };
}

export function applyEatToiletFingerSafety(
  prediction: DemoGesturePrediction | null,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  if (!prediction || (prediction.label !== EAT_LABEL && prediction.label !== TOILET_LABEL)) {
    return { prediction };
  }

  const shape = summarizeEatToiletShape(capturedFrames);
  if (shape.usableFrames < 6) return { prediction };

  if (prediction.label === EAT_LABEL && shape.toiletRatio >= 0.45 && shape.eatRatio < 0.45) {
    return {
      prediction: {
        ...prediction,
        label: TOILET_LABEL,
        pose: "Middle-finger toilet shape",
        matchPercent: Math.max(55, prediction.matchPercent - 5)
      },
      feedback: "The motion looked similar to eating, but the middle-finger shape matched toilet.",
      issueCategory: "hand-shape-mismatch"
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
      feedback: "The motion looked similar to toilet, but the grouped hand shape matched eating.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  if (
    (prediction.label === EAT_LABEL && shape.toiletRatio >= 0.35 && shape.eatRatio >= 0.35) ||
    (prediction.label === TOILET_LABEL && shape.toiletRatio >= 0.35 && shape.eatRatio >= 0.35)
  ) {
    return {
      prediction: null,
      feedback: "That looked close to both eat and toilet. Try again with the finger shape clearer.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  return { prediction };
}

function validateExpectedHandCount(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const expectedHandCount = expectedHandCounts[prediction.label];
  if (!expectedHandCount) return { prediction };

  const summary = summarizeHandCounts(capturedFrames);
  if (summary.usableFrames < 6) return { prediction };

  const expectedRatio = expectedHandCount === 1 ? summary.oneHandRatio : summary.twoHandRatio;
  if (expectedRatio >= 0.65) return { prediction };

  return {
    prediction: null,
    feedback:
      expectedHandCount === 1
        ? "That gesture uses one hand. Try again with only one hand visible."
        : "That gesture uses both hands. Try again with both hands visible.",
    issueCategory: "hand-count-mismatch"
  };
}

function validateYesClosedFist(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const shape = summarizePrimaryHandShape(capturedFrames);
  if (shape.usableFrames < 6) return { prediction };

  if (shape.indexOnlyRatio >= 0.3) {
    return {
      prediction: null,
      feedback: "That looked like one finger was raised. For yes, try the closed-fist gesture again.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  if (shape.closedFistRatio < 0.4 || shape.openHandRatio >= 0.45) {
    return {
      prediction: null,
      feedback: "For yes, keep the hand in a closed fist and try the motion again.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  return { prediction };
}

function validateNoPalmFacing(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const shape = summarizePrimaryHandShape(capturedFrames);
  if (shape.usableFrames >= 6 && shape.openHandRatio < 0.45) {
    return {
      prediction: null,
      feedback: "For no, show an open palm and try the side motion again.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  const orientation = summarizePalmOrientation(capturedFrames);
  if (orientation.usableFrames < 6) return { prediction };

  if (orientation.palmFacingRatio < 0.55) {
    return {
      prediction: null,
      feedback: "For no, face your palm toward the camera and try again.",
      issueCategory: "palm-orientation-mismatch"
    };
  }

  return { prediction };
}

function validateHelpTwoHandShape(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const shape = summarizeHelpShape(capturedFrames);
  if (shape.usableFrames < 6) return { prediction };

  if (shape.supportAndFistRatio < 0.35) {
    return {
      prediction: null,
      feedback: "For help, use one flat support hand and one closed hand.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  if (shape.stackedHelpRatio < 0.3) {
    return {
      prediction: null,
      feedback: "For help, place the closed hand near and above the support hand.",
      issueCategory: "hand-shape-mismatch"
    };
  }

  return { prediction };
}

function validateEatPalmNotFacing(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const orientation = summarizePalmOrientation(capturedFrames);
  if (orientation.usableFrames < 6) return { prediction };

  if (orientation.palmFacingRatio >= 0.55) {
    return {
      prediction: null,
      feedback: "For eat, turn your palm sideways instead of facing it toward the camera.",
      issueCategory: "palm-orientation-mismatch"
    };
  }

  return { prediction };
}

function validateDrinkMotionDirection(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult {
  const motion = summarizePrimaryHandMotion(capturedFrames);
  if (motion.usableFrames < 8 || motion.pathDistance < 0.08) return { prediction };

  // Placeholder direction guard: replace with approved per-gesture motion metadata
  // when the trained recognition model exposes validated start/end landmarks.
  if (motion.verticalDelta > 0.055 && motion.downwardStepRatio >= 0.58) {
    return {
      prediction: null,
      feedback: "For drink, start lower and move the gesture up toward your mouth like the example.",
      issueCategory: "motion-direction-mismatch"
    };
  }

  return { prediction };
}

function resolveEatToiletShapePredictedAsDrink(
  prediction: DemoGesturePrediction,
  capturedFrames: CapturedGestureFrame[]
): EatToiletSafetyResult | null {
  const shape = summarizeEatToiletShape(capturedFrames);
  if (shape.usableFrames < 6) return null;

  const eatShapeIsClear = shape.eatRatio >= 0.55 && shape.toiletRatio < 0.35;
  const toiletShapeIsClear = shape.toiletRatio >= 0.45 && shape.eatRatio < 0.35;
  if (!eatShapeIsClear && !toiletShapeIsClear) {
    if (shape.eatRatio >= 0.35 && shape.toiletRatio >= 0.35) {
      return {
        prediction: null,
        feedback: "That looked close to both eat and toilet. Try again with the finger shape clearer.",
        issueCategory: "hand-shape-mismatch"
      };
    }

    return null;
  }

  const correctedLabel = eatShapeIsClear ? EAT_LABEL : TOILET_LABEL;

  const orientation = summarizePalmOrientation(capturedFrames);
  if (orientation.usableFrames >= 6 && orientation.palmFacingRatio >= 0.55) {
    const correctedPrediction = createCorrectedEatToiletPrediction(prediction, correctedLabel);
    return {
      prediction: null,
      feedbackPrediction: correctedPrediction,
      feedback:
        correctedLabel === EAT_LABEL
          ? "This looked like eat with the palm facing the camera. Turn your palm sideways and try again."
          : "This looked like toilet with the palm facing the camera. Flip the hand around and try again.",
      issueCategory: "palm-orientation-mismatch"
    };
  }

  return {
    prediction: createCorrectedEatToiletPrediction(prediction, correctedLabel)
  };
}

function summarizeHandCounts(capturedFrames: CapturedGestureFrame[]) {
  let usableFrames = 0;
  let oneHandFrames = 0;
  let twoHandFrames = 0;

  capturedFrames.forEach(({ hands }) => {
    const handCount = Math.min(hands.filter((hand) => hand.length >= 21).length, 2);
    if (handCount < 1) return;

    usableFrames += 1;
    if (handCount === 1) oneHandFrames += 1;
    if (handCount === 2) twoHandFrames += 1;
  });

  return {
    usableFrames,
    oneHandRatio: usableFrames ? oneHandFrames / usableFrames : 0,
    twoHandRatio: usableFrames ? twoHandFrames / usableFrames : 0
  };
}

function summarizeHelpShape(capturedFrames: CapturedGestureFrame[]) {
  let usableFrames = 0;
  let supportAndFistFrames = 0;
  let stackedHelpFrames = 0;

  capturedFrames.forEach(({ hands }) => {
    const validHands = hands.filter((hand) => hand.length >= 21).slice(0, 2);
    if (validHands.length !== 2) return;

    usableFrames += 1;

    const first = summarizeHandShape(validHands[0]);
    const second = summarizeHandShape(validHands[1]);
    const candidates = [
      { active: first, support: second },
      { active: second, support: first }
    ];
    const helpCandidate = candidates.find(({ active, support }) => active.isClosed && support.isOpen);

    if (!helpCandidate) return;
    supportAndFistFrames += 1;

    const verticalGap = helpCandidate.support.center.y - helpCandidate.active.center.y;
    const horizontalGap = Math.abs(helpCandidate.support.center.x - helpCandidate.active.center.x);
    const supportLooksFlat = helpCandidate.support.bounds.width >= helpCandidate.support.bounds.height * 0.7;

    if (verticalGap > 0.015 && verticalGap < 0.38 && horizontalGap < 0.28 && supportLooksFlat) {
      stackedHelpFrames += 1;
    }
  });

  return {
    usableFrames,
    supportAndFistRatio: usableFrames ? supportAndFistFrames / usableFrames : 0,
    stackedHelpRatio: usableFrames ? stackedHelpFrames / usableFrames : 0
  };
}

function summarizeHandShape(landmarks: HandLandmarkPoint[]) {
  const nonThumbFingers = getExtendedFingers(landmarks).filter((finger) => finger !== "Thumb");
  const bounds = getBounds(landmarks);

  return {
    isClosed: nonThumbFingers.length === 0,
    isOpen: nonThumbFingers.length >= 3,
    center: getCenter(landmarks),
    bounds
  };
}

function summarizePrimaryHandShape(capturedFrames: CapturedGestureFrame[]) {
  let usableFrames = 0;
  let closedFistFrames = 0;
  let indexOnlyFrames = 0;
  let openHandFrames = 0;

  capturedFrames.forEach(({ hands }) => {
    const primaryHand = hands.find((hand) => hand.length >= 21);
    if (!primaryHand) return;

    usableFrames += 1;
    const nonThumbFingers = getExtendedFingers(primaryHand).filter((finger) => finger !== "Thumb");

    if (nonThumbFingers.length === 0) closedFistFrames += 1;
    if (nonThumbFingers.length === 1 && nonThumbFingers[0] === "Index") indexOnlyFrames += 1;
    if (nonThumbFingers.length >= 3) openHandFrames += 1;
  });

  return {
    usableFrames,
    closedFistRatio: usableFrames ? closedFistFrames / usableFrames : 0,
    indexOnlyRatio: usableFrames ? indexOnlyFrames / usableFrames : 0,
    openHandRatio: usableFrames ? openHandFrames / usableFrames : 0
  };
}

function getCenter(landmarks: HandLandmarkPoint[]) {
  const total = landmarks.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / Math.max(landmarks.length, 1),
    y: total.y / Math.max(landmarks.length, 1)
  };
}

function getBounds(landmarks: HandLandmarkPoint[]) {
  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);

  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function summarizePalmOrientation(capturedFrames: CapturedGestureFrame[]) {
  let usableFrames = 0;
  let palmFacingFrames = 0;

  capturedFrames.forEach(({ handedness, hands }) => {
    const handIndex = hands.findIndex((hand) => hand.length >= 21);
    const primaryHand = handIndex >= 0 ? hands[handIndex] : undefined;
    const handLabel = handedness[handIndex];
    if (!primaryHand || !handLabel || handLabel === "Unknown") return;

    const palmFacing = isPalmFacingCamera(primaryHand, handLabel);
    if (palmFacing === null) return;

    usableFrames += 1;
    if (palmFacing) palmFacingFrames += 1;
  });

  return {
    usableFrames,
    palmFacingRatio: usableFrames ? palmFacingFrames / usableFrames : 0
  };
}

function summarizePrimaryHandMotion(capturedFrames: CapturedGestureFrame[]) {
  const centers: Array<{ x: number; y: number }> = [];

  capturedFrames.forEach(({ hands }) => {
    const primaryHand = hands.find((hand) => hand.length >= 21);
    if (!primaryHand) return;
    centers.push(getCenter(primaryHand));
  });

  if (centers.length < 2) {
    return {
      usableFrames: centers.length,
      verticalDelta: 0,
      pathDistance: 0,
      downwardStepRatio: 0
    };
  }

  const sampleSize = Math.max(2, Math.floor(centers.length * 0.25));
  const start = averagePoints(centers.slice(0, sampleSize));
  const end = averagePoints(centers.slice(-sampleSize));
  let pathDistance = 0;
  let movingSteps = 0;
  let downwardSteps = 0;

  for (let index = 1; index < centers.length; index += 1) {
    const previous = centers[index - 1];
    const current = centers[index];
    const stepDistance = Math.hypot(current.x - previous.x, current.y - previous.y);
    pathDistance += stepDistance;

    if (stepDistance < 0.003) continue;
    movingSteps += 1;
    if (current.y > previous.y) downwardSteps += 1;
  }

  return {
    usableFrames: centers.length,
    verticalDelta: end.y - start.y,
    pathDistance,
    downwardStepRatio: movingSteps ? downwardSteps / movingSteps : 0
  };
}

function summarizeEatToiletShape(capturedFrames: CapturedGestureFrame[]) {
  let usableFrames = 0;
  let toiletLikeFrames = 0;
  let eatLikeFrames = 0;

  capturedFrames.forEach(({ hands }) => {
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

function isPalmFacingCamera(landmarks: HandLandmarkPoint[], handedness: "Left" | "Right" | "Unknown") {
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];
  if (!wrist || !indexBase || !pinkyBase || handedness === "Unknown") return null;

  const indexVector = { x: indexBase.x - wrist.x, y: indexBase.y - wrist.y };
  const pinkyVector = { x: pinkyBase.x - wrist.x, y: pinkyBase.y - wrist.y };
  const palmCross = indexVector.x * pinkyVector.y - indexVector.y * pinkyVector.x;

  if (Math.abs(palmCross) < 0.001) return null;
  return handedness === "Right" ? palmCross < 0 : palmCross > 0;
}

function createCorrectedEatToiletPrediction(
  prediction: DemoGesturePrediction,
  label: typeof EAT_LABEL | typeof TOILET_LABEL,
  posePrefix = "Detected"
) {
  return {
    ...prediction,
    label,
    pose: label === EAT_LABEL ? `${posePrefix} eating hand shape` : `${posePrefix} toilet hand shape`,
    matchPercent: Math.max(55, prediction.matchPercent - 8)
  };
}

function averagePoints(points: Array<{ x: number; y: number }>) {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / Math.max(points.length, 1),
    y: total.y / Math.max(points.length, 1)
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
