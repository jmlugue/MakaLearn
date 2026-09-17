import { NextResponse } from "next/server";
import {
  createTemplateGestureFeedback,
  validateGeminiGestureFeedback,
  type GestureFeedbackIssueCategory,
  type GestureFeedbackRequest,
  type GestureFeedbackTrackingState
} from "@/utils/gesture-feedback";

const GEMINI_TIMEOUT_MS = 6000;
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const ISSUE_CATEGORIES = new Set<GestureFeedbackIssueCategory>([
  "correct",
  "hand-not-visible",
  "too-many-hands",
  "low-confidence",
  "wrong-gesture",
  "unclear-movement",
  "hand-count-mismatch",
  "hand-shape-mismatch",
  "palm-orientation-mismatch",
  "motion-direction-mismatch"
]);
const TRACKING_STATES = new Set<GestureFeedbackTrackingState>([
  "idle",
  "hands-visible",
  "no-hands",
  "too-many-hands",
  "multiple-people"
]);

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export async function POST(request: Request) {
  let payload: GestureFeedbackRequest;

  try {
    const body: unknown = await request.json();
    payload = parseFeedbackRequest(body);
  } catch {
    return NextResponse.json({ error: "Invalid gesture feedback request." }, { status: 400 });
  }

  const fallback = createTemplateGestureFeedback(payload);

  // Palm direction is determined by the local landmark safety rules. Preserve
  // their exact corrective wording so an optional generated response cannot
  // drop an important alternative-gesture cue such as the Eat hand tilt.
  if (payload.issueCategory === "palm-orientation-mismatch" && payload.localFeedbackHint) {
    return NextResponse.json(fallback);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildGeminiPrompt(payload) }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 160,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) return NextResponse.json(fallback);

    const data = (await response.json()) as GeminiGenerateContentResponse;
    const rawText = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!rawText) return NextResponse.json(fallback);

    const parsed = JSON.parse(extractJsonObject(rawText));
    const validated = validateGeminiGestureFeedback(parsed, payload);
    return NextResponse.json(validated ?? fallback);
  } catch {
    return NextResponse.json(fallback);
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeedbackRequest(value: unknown): GestureFeedbackRequest {
  if (!value || typeof value !== "object") throw new Error("Expected object");
  const input = value as Record<string, unknown>;

  if (typeof input.selectedGestureLabel !== "string" || !input.selectedGestureLabel.trim()) throw new Error("Invalid selectedGestureLabel");
  if (input.predictedGestureLabel !== null && typeof input.predictedGestureLabel !== "string") throw new Error("Invalid predictedGestureLabel");
  if (input.matchPercent !== null && typeof input.matchPercent !== "number") throw new Error("Invalid matchPercent");
  if (typeof input.detectedHandCount !== "number") throw new Error("Invalid detectedHandCount");
  if (input.expectedHandCount !== null && typeof input.expectedHandCount !== "number") throw new Error("Invalid expectedHandCount");
  if (typeof input.trackingState !== "string" || !TRACKING_STATES.has(input.trackingState as GestureFeedbackTrackingState)) throw new Error("Invalid trackingState");
  if (typeof input.issueCategory !== "string" || !ISSUE_CATEGORIES.has(input.issueCategory as GestureFeedbackIssueCategory)) throw new Error("Invalid issueCategory");
  if (input.localFeedbackHint !== undefined && typeof input.localFeedbackHint !== "string") throw new Error("Invalid localFeedbackHint");

  return {
    selectedGestureLabel: input.selectedGestureLabel.trim(),
    predictedGestureLabel: input.predictedGestureLabel === null ? null : input.predictedGestureLabel.trim(),
    matchPercent: input.matchPercent,
    detectedHandCount: input.detectedHandCount,
    expectedHandCount: input.expectedHandCount,
    trackingState: input.trackingState as GestureFeedbackTrackingState,
    issueCategory: input.issueCategory as GestureFeedbackIssueCategory,
    localFeedbackHint: input.localFeedbackHint?.trim()
  };
}

function buildGeminiPrompt(payload: GestureFeedbackRequest) {
  return `You write corrective feedback for MakaLearn gesture practice.
Return only strict JSON with exactly these string keys: learnerMessage, teacherNote.
learnerMessage: short, simple, encouraging, suitable for a learner.
teacherNote: slightly more specific guidance for teacher supervision.
Ground the feedback only in this structured local recognition result. Do not diagnose, assess communication ability, invent gestures, mention learner identity, mention camera images, mention Gemini, mention AI, or override teacher judgment.
Structured result:
${JSON.stringify(payload, null, 2)}`;
}

function extractJsonObject(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found");
  return trimmed.slice(start, end + 1);
}
