import type { LearningItem } from "@/types";
import type { HandLandmarkPoint } from "@/utils/gesture-prediction";

export type GesturePracticeMode = "free" | "guided";

export type GuidedSessionPhase =
  | "ready"
  | "countdown"
  | "capturing"
  | "feedback"
  | "complete";

export type GuidedAttemptOutcome = "correct" | "incorrect" | "unclear";

export type GuidedAttempt = {
  targetId: string;
  targetLabel: string;
  predictedLabel: string | null;
  confidence: number | null;
  outcome: GuidedAttemptOutcome;
  attemptNumber: number;
};

export type GuidedGestureResult = {
  gestureId: string;
  gestureLabel: string;
  status: "correct" | "skipped" | "not-attempted";
  attempts: GuidedAttempt[];
};

/** Creates a new run without changing the shared learning-item order. */
export function shuffleGuidedGestures(items: LearningItem[], random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function labelsMatch(left: string, right: string) {
  return simplifyGestureLabel(left) === simplifyGestureLabel(right);
}

export function summarizeGuidedResults(results: GuidedGestureResult[]) {
  const completed = results.filter((result) => result.status === "correct").length;
  const skipped = results.filter((result) => result.status === "skipped").length;
  const firstTryCorrect = results.filter(
    (result) => result.status === "correct" && result.attempts.length === 1 && result.attempts[0]?.outcome === "correct"
  ).length;
  const totalAttempts = results.reduce((total, result) => total + result.attempts.length, 0);

  return { completed, skipped, firstTryCorrect, totalAttempts };
}

/**
 * Lightweight command-pose heuristic used only on the guided ready screen.
 * It is deliberately separate from the trained seven-gesture classifier.
 */
export function isThumbsUpPose(hands: HandLandmarkPoint[][]) {
  if (hands.length !== 1) return false;
  const hand = hands[0];
  if (hand.length < 21) return false;

  const wrist = hand[0];
  const thumbMcp = hand[2];
  const thumbIp = hand[3];
  const thumbTip = hand[4];
  const middleMcp = hand[9];
  if (!wrist || !thumbMcp || !thumbIp || !thumbTip || !middleMcp) return false;

  const palmSize = Math.max(distance(wrist, middleMcp), 0.001);
  const thumbVector = {
    x: thumbTip.x - thumbMcp.x,
    y: thumbTip.y - thumbMcp.y
  };
  const thumbPointsUp =
    thumbTip.y < thumbIp.y &&
    thumbIp.y < thumbMcp.y &&
    -thumbVector.y > Math.abs(thumbVector.x) * 0.75 &&
    thumbMcp.y - thumbTip.y > palmSize * 0.65;
  const thumbExtended = distance(wrist, thumbTip) > distance(wrist, thumbIp) * 1.08;

  const foldedFingerIndexes = [
    { pip: 6, tip: 8 },
    { pip: 10, tip: 12 },
    { pip: 14, tip: 16 },
    { pip: 18, tip: 20 }
  ];
  const foldedCount = foldedFingerIndexes.filter(({ pip, tip }) => {
    const pipPoint = hand[pip];
    const tipPoint = hand[tip];
    if (!pipPoint || !tipPoint) return false;
    return distance(wrist, tipPoint) < distance(wrist, pipPoint) * 1.12;
  }).length;

  return thumbPointsUp && thumbExtended && foldedCount >= 3;
}

function simplifyGestureLabel(label: string) {
  const trimmed = label.trim().toLowerCase();
  if (trimmed.includes("toilet")) return "toilet";
  if (trimmed.includes("eat")) return "eat";
  if (trimmed.includes("drink")) return "drink";
  if (trimmed.includes("sit")) return "sit";
  if (trimmed.includes("help")) return "help";
  if (trimmed === "yes" || trimmed.endsWith(" yes")) return "yes";
  if (trimmed === "no" || trimmed.endsWith(" no")) return "no";
  return trimmed.replace(/^i want to /, "");
}

function distance(left: HandLandmarkPoint, right: HandLandmarkPoint) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}
