import type { PracticeStatus } from "@/types";

// Future gesture recognition model: replace the simulated status input with
// webcam frame analysis and confidence scores from the approved model.
// Future corrective feedback model or AI feedback: generate more specific
// guidance after comparing the learner's motion with approved reference data.
export function generateFeedbackPlaceholder(status: PracticeStatus) {
  switch (status) {
    case "Correct":
      return "Clear attempt. Reinforce the success and repeat once for consistency.";
    case "Good attempt":
      return "Good effort. Repeat with a slower start and a clear finish.";
    case "Needs practice":
      return "Practice the starting position first, then try the full movement again.";
    case "No hand detected":
      return "Check that hands are visible in the camera frame before trying again.";
  }
}

// Future AI feedback: replace this presentation-only response with a guarded
// corrective feedback service that uses approved gesture references and school policy.
export function generateCorrectiveFeedbackPlaceholder() {
  return "Good try.";
}
