import type { DemoGesturePrediction } from "@/utils/gesture-prediction";

export type GestureFeedbackIssueCategory =
  | "correct"
  | "hand-not-visible"
  | "too-many-hands"
  | "low-confidence"
  | "wrong-gesture"
  | "unclear-movement"
  | "hand-count-mismatch"
  | "hand-shape-mismatch"
  | "palm-orientation-mismatch"
  | "motion-direction-mismatch";

export type GestureFeedbackSource = "gemini" | "template";

export type GestureFeedbackTrackingState =
  | "idle"
  | "hands-visible"
  | "no-hands"
  | "too-many-hands"
  | "multiple-people";

export type GestureFeedbackRequest = {
  selectedGestureLabel: string;
  predictedGestureLabel: string | null;
  matchPercent: number | null;
  detectedHandCount: number;
  expectedHandCount: number | null;
  trackingState: GestureFeedbackTrackingState;
  issueCategory: GestureFeedbackIssueCategory;
  localFeedbackHint?: string;
};

export type GestureFeedbackResponse = {
  source: GestureFeedbackSource;
  issueCategory: GestureFeedbackIssueCategory;
  learnerMessage: string;
  teacherNote: string;
};

export type GestureFeedbackCandidate = {
  learnerMessage?: unknown;
  teacherNote?: unknown;
};

const LOW_CONFIDENCE_PERCENT = 70;
const MAX_LEARNER_MESSAGE_LENGTH = 140;
const MAX_TEACHER_NOTE_LENGTH = 240;
const UNSAFE_FEEDBACK_PATTERNS = [
  /\bdiagnos(?:e|is|tic)\b/i,
  /\btherapy\b/i,
  /\btreatment\b/i,
  /\bmedical\b/i,
  /\bclinical\b/i,
  /\bdisorder\b/i,
  /\bimpairment\b/i,
  /\bdisabled\b/i,
  /\bautis(?:m|tic)\b/i,
  /\bcan(?:not|'t) communicate\b/i,
  /\boverride\b/i,
  /\binvent(?:ed)? gesture\b/i
];

export function buildGestureFeedbackRequest(input: {
  selectedGestureLabel: string;
  feedbackTargetLabel?: string;
  prediction: DemoGesturePrediction | null;
  detectedHandCount: number;
  expectedHandCount: number | null;
  trackingState: GestureFeedbackTrackingState;
  localFeedbackHint?: string;
  localIssueCategory?: GestureFeedbackIssueCategory;
}): GestureFeedbackRequest {
  const feedbackTargetLabel = input.feedbackTargetLabel?.trim() || input.prediction?.label || input.selectedGestureLabel;

  const requestWithoutIssue = {
    selectedGestureLabel: feedbackTargetLabel,
    predictedGestureLabel: input.prediction?.label ?? null,
    matchPercent: input.prediction?.matchPercent ?? null,
    detectedHandCount: input.detectedHandCount,
    expectedHandCount: input.expectedHandCount,
    trackingState: input.trackingState,
    localFeedbackHint: input.localFeedbackHint
  };

  return {
    ...requestWithoutIssue,
    issueCategory: deriveGestureFeedbackIssue({
      ...requestWithoutIssue,
      localIssueCategory: input.localIssueCategory
    })
  };
}

export function deriveGestureFeedbackIssue(input: {
  selectedGestureLabel: string;
  predictedGestureLabel: string | null;
  matchPercent: number | null;
  detectedHandCount: number;
  expectedHandCount: number | null;
  trackingState: GestureFeedbackTrackingState;
  localIssueCategory?: GestureFeedbackIssueCategory;
}): GestureFeedbackIssueCategory {
  if (input.trackingState === "too-many-hands" || input.trackingState === "multiple-people" || input.detectedHandCount > 2) {
    return "too-many-hands";
  }

  if (input.trackingState === "no-hands" || input.detectedHandCount === 0) {
    return "hand-not-visible";
  }

  if (input.expectedHandCount !== null && input.detectedHandCount > 0 && input.detectedHandCount !== input.expectedHandCount) {
    return "hand-count-mismatch";
  }

  if (input.localIssueCategory && input.localIssueCategory !== "correct") {
    return input.localIssueCategory;
  }

  if (!input.predictedGestureLabel) {
    return "unclear-movement";
  }

  if (typeof input.matchPercent === "number" && input.matchPercent < LOW_CONFIDENCE_PERCENT) {
    return "low-confidence";
  }

  if (!labelsMatch(input.selectedGestureLabel, input.predictedGestureLabel)) {
    return "wrong-gesture";
  }

  return "correct";
}

export function createTemplateGestureFeedback(request: GestureFeedbackRequest): GestureFeedbackResponse {
  const selected = simplifyGestureLabel(request.selectedGestureLabel);
  const predicted = request.predictedGestureLabel ? simplifyGestureLabel(request.predictedGestureLabel) : "another gesture";
  const matchPercent = request.matchPercent ?? 0;

  const templates: Record<GestureFeedbackIssueCategory, Omit<GestureFeedbackResponse, "source" | "issueCategory">> = {
    correct: {
      learnerMessage: `Great signing. That looked like ${selected}.`,
      teacherNote: `The recognizer identified ${request.selectedGestureLabel}${request.matchPercent === null ? "." : ` at ${matchPercent}% confidence.`}`
    },
    "hand-not-visible": {
      learnerMessage: "Show your hands in the camera box, then try again.",
      teacherNote: "No hand landmarks were available for this attempt. Reposition the learner or camera before repeating."
    },
    "too-many-hands": {
      learnerMessage: "I see extra hands. Try again with only your hands in the box.",
      teacherNote: "More than the supported hands were detected, so the attempt was not treated as a valid gesture sample."
    },
    "low-confidence": {
      learnerMessage: `Good try. Make ${selected} a little clearer and try once more.`,
      teacherNote: `The model confidence was below ${LOW_CONFIDENCE_PERCENT}%${request.matchPercent === null ? "." : ` at ${matchPercent}%.`} Give a slower demonstration and repeat.`
    },
    "wrong-gesture": {
      learnerMessage: `Good try. This looked like ${predicted}. Try ${selected} again.`,
      teacherNote: `The local recognizer predicted ${request.predictedGestureLabel ?? "another gesture"}, but this attempt was being compared with ${request.selectedGestureLabel}. Use this only when a teacher has assigned a specific target.`
    },
    "unclear-movement": {
      learnerMessage: `Good effort. Try ${selected} again slowly in the camera box.`,
      teacherNote: "The gesture movement was not clear enough for a supported local prediction. Cue the start and finish positions."
    },
    "hand-count-mismatch": {
      learnerMessage: `Try ${selected} again with the same hands as the example.`,
      teacherNote: `Detected ${request.detectedHandCount} hand${request.detectedHandCount === 1 ? "" : "s"}; this reference expects ${request.expectedHandCount} hand${request.expectedHandCount === 1 ? "" : "s"}.`
    },
    "hand-shape-mismatch": {
      learnerMessage: request.localFeedbackHint ?? `Try ${selected} again with a clearer hand shape.`,
      teacherNote: request.localFeedbackHint ?? `The local shape check did not match the expected hand shape for ${request.selectedGestureLabel}.`
    },
    "palm-orientation-mismatch": {
      learnerMessage: request.localFeedbackHint ?? `Try ${selected} again with your palm turned like the example.`,
      teacherNote: request.localFeedbackHint ?? `The local orientation check did not match the expected palm direction for ${request.selectedGestureLabel}.`
    },
    "motion-direction-mismatch": {
      learnerMessage: request.localFeedbackHint ?? `Try ${selected} again in the same direction as the example.`,
      teacherNote: request.localFeedbackHint ?? `The local motion check detected the gesture moving in the opposite direction for ${request.selectedGestureLabel}.`
    }
  };

  return {
    source: "template",
    issueCategory: request.issueCategory,
    ...templates[request.issueCategory]
  };
}

export function validateGeminiGestureFeedback(
  candidate: GestureFeedbackCandidate,
  request: GestureFeedbackRequest
): GestureFeedbackResponse | null {
  const learnerMessage = normalizeFeedbackText(candidate.learnerMessage, MAX_LEARNER_MESSAGE_LENGTH);
  const teacherNote = normalizeFeedbackText(candidate.teacherNote, MAX_TEACHER_NOTE_LENGTH);

  if (!learnerMessage || !teacherNote) return null;
  if (isUnsafeFeedbackText(learnerMessage) || isUnsafeFeedbackText(teacherNote)) return null;
  if (!isGroundedFeedbackText(`${learnerMessage} ${teacherNote}`, request)) return null;

  return {
    source: "gemini",
    issueCategory: request.issueCategory,
    learnerMessage,
    teacherNote
  };
}

export function simplifyGestureLabel(label: string) {
  if (/toilet/i.test(label)) return "toilet";
  if (/eat food/i.test(label)) return "eat";
  if (/drink water/i.test(label)) return "drink";
  if (/sit/i.test(label)) return "sit";

  return label.replace(/^I want to /i, "").trim().toLowerCase();
}

function labelsMatch(left: string, right: string) {
  return simplifyGestureLabel(left) === simplifyGestureLabel(right);
}

function normalizeFeedbackText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function isUnsafeFeedbackText(value: string) {
  return UNSAFE_FEEDBACK_PATTERNS.some((pattern) => pattern.test(value));
}

function isGroundedFeedbackText(value: string, request: GestureFeedbackRequest) {
  const allowedGestureLabels = [request.selectedGestureLabel, request.predictedGestureLabel]
    .filter((label): label is string => Boolean(label))
    .flatMap((label) => [label.toLowerCase(), simplifyGestureLabel(label)]);

  const knownGestureLabels = ["toilet", "eat", "drink", "help", "yes", "no", "sit"];
  const localHintGestureLabels = request.localFeedbackHint
    ? knownGestureLabels.filter((label) => includesGestureWord(request.localFeedbackHint ?? "", label))
    : [];
  const mentionedKnownGestures = knownGestureLabels.filter((label) => includesGestureWord(value, label));
  return mentionedKnownGestures.every(
    (label) =>
      localHintGestureLabels.includes(label) ||
      allowedGestureLabels.some((allowed) => allowed.includes(label) || label.includes(allowed))
  );
}

function includesGestureWord(value: string, label: string) {
  return new RegExp(`\\b${label}\\b`, "i").test(value);
}

