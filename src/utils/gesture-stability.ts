import type { HandLandmarkPoint } from "./gesture-prediction";

export const STABLE_POSE_MOVEMENT_TOLERANCE = 0.16;
export const PREDICTED_POSE_REARM_DISTANCE = 0.3;

export function copyHands(hands: HandLandmarkPoint[][]) {
  return hands.map((hand) => hand.map((point) => ({ x: point.x, y: point.y, z: point.z })));
}

/**
 * Measures whole-pose movement relative to palm size. Root-mean-square distance
 * prevents one noisy fingertip from continually restarting the hold timer,
 * while still detecting intentional hand or finger movement.
 */
export function getHandPoseDistance(reference: HandLandmarkPoint[][] | null, current: HandLandmarkPoint[][]) {
  if (!reference || reference.length !== current.length) return Number.POSITIVE_INFINITY;

  const referenceHands = sortHandsLeftToRight(reference);
  const currentHands = sortHandsLeftToRight(current);
  let squaredDistanceTotal = 0;
  let comparedPointCount = 0;

  for (let handIndex = 0; handIndex < referenceHands.length; handIndex += 1) {
    const referenceHand = referenceHands[handIndex];
    const currentHand = currentHands[handIndex];
    if (!referenceHand?.length || referenceHand.length !== currentHand?.length) {
      return Number.POSITIVE_INFINITY;
    }

    const scale = Math.max((getPalmScale(referenceHand) + getPalmScale(currentHand)) / 2, 0.01);
    for (let pointIndex = 0; pointIndex < referenceHand.length; pointIndex += 1) {
      const referencePoint = referenceHand[pointIndex];
      const currentPoint = currentHand[pointIndex];
      const normalizedDistance =
        Math.hypot(
          Number(currentPoint.x) - Number(referencePoint.x),
          Number(currentPoint.y) - Number(referencePoint.y)
        ) / scale;
      squaredDistanceTotal += normalizedDistance * normalizedDistance;
      comparedPointCount += 1;
    }
  }

  return comparedPointCount > 0
    ? Math.sqrt(squaredDistanceTotal / comparedPointCount)
    : Number.POSITIVE_INFINITY;
}

function sortHandsLeftToRight(hands: HandLandmarkPoint[][]) {
  return [...hands].sort((left, right) => Number(left[0]?.x ?? 0) - Number(right[0]?.x ?? 0));
}

function getPalmScale(hand: HandLandmarkPoint[]) {
  const wrist = hand[0];
  const middleFingerBase = hand[9];
  if (!wrist || !middleFingerBase) return 0;
  return Math.hypot(
    Number(middleFingerBase.x) - Number(wrist.x),
    Number(middleFingerBase.y) - Number(wrist.y)
  );
}
