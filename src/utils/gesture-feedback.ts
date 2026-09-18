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
  const matchPercent = request.matchPercent ?? 0;

  const templates: Record<GestureFeedbackIssueCategory, Omit<GestureFeedbackResponse, "source" | "issueCategory">> = {
    correct: {
      learnerMessage: createLearnerGestureMessage("correct"),
      teacherNote: `The recognizer identified ${request.selectedGestureLabel}${request.matchPercent === null ? "." : ` at ${matchPercent}% confidence.`}`
    },
    "hand-not-visible": {
      learnerMessage: createLearnerGestureMessage("hand-not-visible"),
      teacherNote: "No hand landmarks were available for this attempt. Reposition the learner or camera before repeating."
    },
    "too-many-hands": {
      learnerMessage: createLearnerGestureMessage("too-many-hands"),
      teacherNote: "More than the supported hands were detected, so the attempt was not treated as a valid gesture sample."
    },
    "low-confidence": {
      learnerMessage: createLearnerGestureMessage("low-confidence"),
      teacherNote: `The model confidence was below ${LOW_CONFIDENCE_PERCENT}%${request.matchPercent === null ? "." : ` at ${matchPercent}%.`} Give a slower demonstration and repeat.`
    },
    "wrong-gesture": {
      learnerMessage: createLearnerGestureMessage("wrong-gesture"),
      teacherNote: `The local recognizer predicted ${request.predictedGestureLabel ?? "another gesture"}, but this attempt was being compared with ${request.selectedGestureLabel}. Use this only when a teacher has assigned a specific target.`
    },
    "unclear-movement": {
      learnerMessage: createLearnerGestureMessage("unclear-movement"),
      teacherNote: "The gesture movement was not clear enough for a supported local prediction. Cue the start and finish positions."
    },
    "hand-count-mismatch": {
      learnerMessage: createLearnerGestureMessage("hand-count-mismatch"),
      teacherNote: `The camera detected ${request.detectedHandCount} hand${request.detectedHandCount === 1 ? "" : "s"}, but this gesture uses ${request.expectedHandCount} hand${request.expectedHandCount === 1 ? "" : "s"}. Ask the learner to match the number of hands shown in the example and try again.`
    },
    "hand-shape-mismatch": {
      learnerMessage: createLearnerGestureMessage("hand-shape-mismatch"),
      teacherNote: request.localFeedbackHint ?? `The local shape check did not match the expected hand shape for ${request.selectedGestureLabel}.`
    },
    "palm-orientation-mismatch": {
      learnerMessage: createLearnerGestureMessage("palm-orientation-mismatch"),
      teacherNote: request.localFeedbackHint ?? `The local orientation check did not match the expected palm direction for ${request.selectedGestureLabel}.`
    },
    "motion-direction-mismatch": {
      learnerMessage: createLearnerGestureMessage("motion-direction-mismatch"),
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
  const generatedLearnerMessage = normalizeFeedbackText(candidate.learnerMessage, 140);
  const teacherNote = normalizeFeedbackText(candidate.teacherNote, MAX_TEACHER_NOTE_LENGTH);

  if (!generatedLearnerMessage || !teacherNote) return null;
  if (isUnsafeFeedbackText(generatedLearnerMessage) || isUnsafeFeedbackText(teacherNote)) return null;
  if (!isContinuousTeacherNote(teacherNote)) return null;
  if (!isGroundedFeedbackText(`${generatedLearnerMessage} ${teacherNote}`, request)) return null;

  return {
    source: "gemini",
    issueCategory: request.issueCategory,
    // Learner-facing copy stays deterministic and easy to understand. Generated
    // feedback is reserved for the more detailed teacher note.
    learnerMessage: createLearnerGestureMessage(request.issueCategory),
    teacherNote
  };
}

/** Short, consistent prompts for learners who may have limited reading comprehension. */
export function createLearnerGestureMessage(issueCategory: GestureFeedbackIssueCategory) {
  const messages: Record<GestureFeedbackIssueCategory, string> = {
    correct: "Great job!",
    "hand-not-visible": "Hands in the box.",
    "too-many-hands": "Only your hands.",
    "low-confidence": "Try again slowly.",
    "wrong-gesture": "Try again.",
    "unclear-movement": "Try again slowly.",
    "hand-count-mismatch": "Copy the example.",
    "hand-shape-mismatch": "Copy the hand shape.",
    "palm-orientation-mismatch": "Turn your hand.",
    "motion-direction-mismatch": "Move the same way."
  };

  return messages[issueCategory];
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

function isContinuousTeacherNote(value: string) {
  // Reject label-like generated copy such as "Observation:" or "Next cue:".
  // The route will use the sentence-based template fallback instead.
  return !/[:;\u2022]/.test(value) && !/(^|\s)[*-]\s/.test(value);
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

