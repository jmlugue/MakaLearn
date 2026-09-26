import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTypeScriptModule(relativePath, stubs = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const sandbox = {
    exports: {},
    require: (id) => stubs[id] ?? require(id),
    console,
    process,
    Request,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: (...args) => globalThis.fetch(...args)
  };
  createContext(sandbox);
  new Script(compiled).runInContext(sandbox);
  return sandbox.exports;
}

const gestureFeedback = loadTypeScriptModule("../src/utils/gesture-feedback.ts");
const {
  buildGestureFeedbackRequest,
  createTemplateGestureFeedback,
  deriveGestureFeedbackIssue,
  validateGeminiGestureFeedback
} = gestureFeedback;

const base = {
  selectedGestureLabel: "Help",
  predictedGestureLabel: "Help",
  matchPercent: 94,
  detectedHandCount: 2,
  expectedHandCount: 2,
  trackingState: "hands-visible"
};

assert.equal(deriveGestureFeedbackIssue(base), "correct");
assert.equal(deriveGestureFeedbackIssue({ ...base, detectedHandCount: 0, trackingState: "no-hands" }), "hand-not-visible");
assert.equal(deriveGestureFeedbackIssue({ ...base, detectedHandCount: 3, trackingState: "too-many-hands" }), "too-many-hands");
assert.equal(deriveGestureFeedbackIssue({ ...base, detectedHandCount: 1 }), "hand-count-mismatch");
assert.equal(deriveGestureFeedbackIssue({ ...base, matchPercent: 41 }), "low-confidence");
assert.equal(deriveGestureFeedbackIssue({ ...base, predictedGestureLabel: "No" }), "wrong-gesture");
assert.equal(deriveGestureFeedbackIssue({ ...base, predictedGestureLabel: null, matchPercent: null }), "unclear-movement");

const categories = [
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
];

for (const issueCategory of categories) {
  const feedback = createTemplateGestureFeedback({ ...base, issueCategory });
  assert.equal(feedback.source, "template");
  assert.equal(feedback.issueCategory, issueCategory);
  assert.ok(feedback.learnerMessage.length > 5);
  assert.ok(feedback.teacherNote.length > 10);
}

const request = buildGestureFeedbackRequest({
  selectedGestureLabel: "Help",
  prediction: { label: "Help", matchPercent: 93 },
  detectedHandCount: 2,
  expectedHandCount: 2,
  trackingState: "hands-visible"
});
assert.equal(request.issueCategory, "correct");

const localPalmRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "I want to eat",
  prediction: { label: "I want to eat", matchPercent: 94 },
  detectedHandCount: 1,
  expectedHandCount: 1,
  trackingState: "hands-visible",
  localFeedbackHint: "For eat, turn your palm sideways instead of facing it toward the camera.",
  localIssueCategory: "palm-orientation-mismatch"
});
assert.equal(localPalmRequest.issueCategory, "palm-orientation-mismatch");
assert.equal(createTemplateGestureFeedback(localPalmRequest).learnerMessage, "Turn your hand.");
assert.match(createTemplateGestureFeedback(localPalmRequest).teacherNote, /palm sideways/i);

const freePracticeRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "Help",
  feedbackTargetLabel: "Yes",
  prediction: { label: "Yes", matchPercent: 92 },
  detectedHandCount: 1,
  expectedHandCount: 1,
  trackingState: "hands-visible"
});
assert.equal(freePracticeRequest.issueCategory, "correct");
assert.equal(freePracticeRequest.selectedGestureLabel, "Yes");

const valid = validateGeminiGestureFeedback(
  {
    learnerMessage: "Nice work signing help.",
    teacherNote: "The local result matched Help at high confidence. Continue with the next prompt."
  },
  request
);
assert.equal(valid?.source, "gemini");
assert.equal(valid?.learnerMessage, "Great job!");

assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "Try again.",
      teacherNote: "Observation: the hand shape was unclear. Next cue: ask the learner to slow down."
    },
    request
  ),
  null
);

assert.equal(validateGeminiGestureFeedback({ learnerMessage: "Nice work." }, request), null);
assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "This diagnoses a communication disorder.",
      teacherNote: "Use this as medical treatment."
    },
    request
  ),
  null
);
assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "Try toilet instead.",
      teacherNote: "This invents a different target gesture."
    },
    request
  ),
  null
);

const eatToiletComparisonRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "I want to go to toilet",
  prediction: { label: "I want to go to toilet", matchPercent: 88 },
  detectedHandCount: 1,
  expectedHandCount: 1,
  trackingState: "hands-visible",
  localFeedbackHint: "The motion looked similar to eating, but the middle-finger shape matched toilet.",
  localIssueCategory: "hand-shape-mismatch"
});
assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "Good try. Keep the toilet finger shape clear.",
      teacherNote: "This was close to eating motion, but the local shape check matched toilet."
    },
    eatToiletComparisonRequest
  )?.source,
  "gemini"
);
assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "Try drink instead.",
      teacherNote: "This invents a different target gesture."
    },
    eatToiletComparisonRequest
  ),
  null
);
assert.equal(
  validateGeminiGestureFeedback(
    {
      learnerMessage: "x".repeat(141),
      teacherNote: "The message is too long."
    },
    request
  ),
  null
);

const route = loadTypeScriptModule("../src/app/api/gesture-feedback/route.ts", {
  "next/server": {
    NextResponse: {
      json(body, init) {
        return {
          status: init?.status ?? 200,
          async json() {
            return body;
          }
        };
      }
    }
  },
  "@/utils/gesture-feedback": gestureFeedback
});

const gesturePrediction = loadTypeScriptModule("../src/utils/gesture-prediction.ts");
const gestureShapeSafety = loadTypeScriptModule("../src/utils/gesture-shape-safety.ts", {
  "@/utils/gesture-feedback": gestureFeedback,
  "@/utils/gesture-prediction": gesturePrediction
});
const {
  applyBasicGesturePredictionGuards,
  applyGestureCandidateGuards
} = gestureShapeSafety;

function makeHand(centerY, palmFacing = false, extendedFingers = []) {
  const hand = Array.from({ length: 21 }, (_, index) => ({
    x: 0.5 + (index % 5) * 0.002,
    y: centerY + Math.floor(index / 5) * 0.002,
    z: 0
  }));
  hand[0] = { x: 0.5, y: centerY + 0.1, z: 0 };
  hand[5] = { x: palmFacing ? 0.56 : 0.44, y: centerY, z: 0 };
  hand[17] = { x: palmFacing ? 0.44 : 0.56, y: centerY, z: 0 };

  const fingerJoints = {
    Index: [5, 6, 8],
    Middle: [9, 10, 12],
    Ring: [13, 14, 16],
    Pinky: [17, 18, 20]
  };

  Object.entries(fingerJoints).forEach(([finger, [baseIndex, middleIndex, tipIndex]], offset) => {
    const base = hand[baseIndex];
    const fingerX = base.x + (offset - 1.5) * 0.01;
    const isExtended = extendedFingers.includes(finger);

    hand[baseIndex] = { x: fingerX, y: base.y, z: 0 };
    hand[middleIndex] = { x: fingerX, y: isExtended ? centerY - 0.04 : centerY + 0.04, z: 0 };
    hand[tipIndex] = { x: fingerX, y: isExtended ? centerY - 0.12 : centerY + 0.055, z: 0 };
  });

  return hand;
}

function makeFrames(ys, palmFacing = false, extendedFingers = []) {
  return ys.map((y) => ({
    hands: [makeHand(y, palmFacing, extendedFingers)],
    handedness: ["Right"]
  }));
}

const sitFrames = Array.from({ length: 8 }, () => ({
  hands: [makeHand(0.55), makeHand(0.25)],
  handedness: ["Left", "Right"]
}));
const helpShapedModelCandidate = applyGestureCandidateGuards(
  {
    label: "Help",
    pose: "Help gesture",
    fingers: [],
    handCount: 2,
    matchPercent: 91
  },
  sitFrames
);
assert.equal(helpShapedModelCandidate.prediction?.label, "Sit down");

const changingHandCountResult = applyBasicGesturePredictionGuards(
  {
    label: "Sit down",
    pose: "Sit gesture",
    fingers: [],
    handCount: 2,
    matchPercent: 91
  },
  [...sitFrames.slice(0, 5), ...makeFrames([0.3, 0.3, 0.3])]
);
assert.equal(changingHandCountResult.prediction, null);
assert.equal(changingHandCountResult.issueCategory, "hand-count-mismatch");
assert.match(changingHandCountResult.feedback, /changed during the gesture/i);

const changingHandCountRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "Sit down",
  prediction: {
    label: "Sit down",
    pose: "Sit gesture",
    fingers: [],
    handCount: 2,
    matchPercent: 91
  },
  detectedHandCount: 2,
  expectedHandCount: 2,
  trackingState: "hands-visible",
  localFeedbackHint: changingHandCountResult.feedback,
  localIssueCategory: changingHandCountResult.issueCategory
});
const changingHandCountFeedback = createTemplateGestureFeedback(
  changingHandCountRequest
);
assert.equal(changingHandCountFeedback.learnerMessage, "Keep both hands visible.");
assert.match(changingHandCountFeedback.teacherNote, /changed during the gesture/i);
assert.doesNotMatch(changingHandCountFeedback.teacherNote, /detected 2 hands, but/i);

const eatPalmFacingResult = applyBasicGesturePredictionGuards(
  { label: "I want to eat", pose: "Eating gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames(Array.from({ length: 8 }, () => 0.35), true)
);
assert.equal(eatPalmFacingResult.prediction, null);
assert.equal(eatPalmFacingResult.issueCategory, "palm-orientation-mismatch");

const movingBackhandNoResult = applyBasicGesturePredictionGuards(
  { label: "No", pose: "No gesture", fingers: [], handCount: 1, matchPercent: 91 },
  makeFrames([0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35], false, ["Index", "Middle", "Ring", "Pinky"])
    .map((frame, index) => ({
      ...frame,
      hands: [frame.hands[0].map((point) => ({ ...point, x: point.x + index * 0.012 }))]
    }))
);
assert.equal(movingBackhandNoResult.prediction, null);
assert.equal(movingBackhandNoResult.issueCategory, "palm-orientation-mismatch");
assert.match(movingBackhandNoResult.feedback, /keep the side motion/i);
assert.match(movingBackhandNoResult.feedback, /trying to sign eat, tilt your hand slightly/i);

const noPalmWithEatHintRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "I want to eat",
  feedbackTargetLabel: "No",
  prediction: { label: "No", matchPercent: 91 },
  detectedHandCount: 1,
  expectedHandCount: 1,
  trackingState: "hands-visible",
  localFeedbackHint: movingBackhandNoResult.feedback,
  localIssueCategory: movingBackhandNoResult.issueCategory
});
assert.equal(createTemplateGestureFeedback(noPalmWithEatHintRequest).learnerMessage, "Turn your hand.");
assert.match(createTemplateGestureFeedback(noPalmWithEatHintRequest).teacherNote, /tilt your hand slightly/i);

const wrongGestureRequest = buildGestureFeedbackRequest({
  selectedGestureLabel: "No",
  feedbackTargetLabel: "No",
  prediction: { label: "Yes", matchPercent: 91 },
  detectedHandCount: 1,
  expectedHandCount: 1,
  trackingState: "hands-visible"
});
const wrongGestureFeedback = createTemplateGestureFeedback(wrongGestureRequest);
assert.equal(wrongGestureFeedback.learnerMessage, "Try again.");
assert.match(wrongGestureFeedback.teacherNote, /predicted Yes/i);
assert.doesNotMatch(wrongGestureFeedback.learnerMessage, /looked like|show no/i);

const drinkReversedResult = applyBasicGesturePredictionGuards(
  { label: "I want to drink", pose: "Drinking gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames([0.3, 0.32, 0.35, 0.38, 0.41, 0.44, 0.47, 0.5])
);
assert.equal(drinkReversedResult.prediction, null);
assert.equal(drinkReversedResult.issueCategory, "motion-direction-mismatch");

const drinkPredictedForFlippedEatResult = applyBasicGesturePredictionGuards(
  { label: "I want to drink", pose: "Drinking gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames(Array.from({ length: 8 }, () => 0.35), true, ["Index", "Middle", "Ring", "Pinky"])
);
assert.equal(drinkPredictedForFlippedEatResult.prediction, null);
assert.equal(drinkPredictedForFlippedEatResult.feedbackPrediction?.label, "I want to eat");
assert.equal(drinkPredictedForFlippedEatResult.issueCategory, "palm-orientation-mismatch");

const drinkPredictedForFlippedToiletResult = applyBasicGesturePredictionGuards(
  { label: "I want to drink", pose: "Drinking gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames(Array.from({ length: 8 }, () => 0.35), true, ["Middle"])
);
assert.equal(drinkPredictedForFlippedToiletResult.prediction, null);
assert.equal(drinkPredictedForFlippedToiletResult.feedbackPrediction?.label, "I want to go to toilet");
assert.equal(drinkPredictedForFlippedToiletResult.issueCategory, "palm-orientation-mismatch");

const drinkPredictedForEatShapeResult = applyBasicGesturePredictionGuards(
  { label: "I want to drink", pose: "Drinking gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames(Array.from({ length: 8 }, () => 0.35), false, ["Index", "Middle", "Ring", "Pinky"])
);
assert.equal(drinkPredictedForEatShapeResult.prediction?.label, "I want to eat");

const drinkPredictedForToiletShapeResult = applyBasicGesturePredictionGuards(
  { label: "I want to drink", pose: "Drinking gesture", fingers: [], handCount: 1, matchPercent: 94 },
  makeFrames(Array.from({ length: 8 }, () => 0.35), false, ["Middle"])
);
assert.equal(drinkPredictedForToiletShapeResult.prediction?.label, "I want to go to toilet");

async function postRoute(payload) {
  return route.POST(new Request("http://localhost/api/gesture-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }));
}

function mockGeminiText(text) {
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ]
      };
    }
  });
}

const originalFetch = globalThis.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;

try {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "gemini-test";

  mockGeminiText(JSON.stringify({
    learnerMessage: "Nice work signing help.",
    teacherNote: "The local result matched Help clearly. Keep supervising the next attempt."
  }));
  assert.equal((await (await postRoute(request)).json()).source, "gemini");

  let palmFeedbackFetchCalled = false;
  globalThis.fetch = async () => {
    palmFeedbackFetchCalled = true;
    throw new Error("Local palm feedback should not call Gemini");
  };
  const palmFeedbackResponse = await (await postRoute(noPalmWithEatHintRequest)).json();
  assert.equal(palmFeedbackResponse.source, "template");
  assert.equal(palmFeedbackResponse.learnerMessage, "Turn your hand.");
  assert.match(palmFeedbackResponse.teacherNote, /trying to sign eat, tilt your hand slightly/i);
  assert.equal(palmFeedbackFetchCalled, false);

  mockGeminiText("not-json");
  assert.equal((await (await postRoute(request)).json()).source, "template");

  mockGeminiText(JSON.stringify({
    learnerMessage: "This diagnoses a disorder.",
    teacherNote: "Use it as medical treatment."
  }));
  assert.equal((await (await postRoute(request)).json()).source, "template");

  globalThis.fetch = async () => {
    throw new Error("timeout");
  };
  assert.equal((await (await postRoute(request)).json()).source, "template");

  delete process.env.GEMINI_API_KEY;
  let calledWithoutKey = false;
  globalThis.fetch = async () => {
    calledWithoutKey = true;
    throw new Error("fetch should not run without key");
  };
  assert.equal((await (await postRoute(request)).json()).source, "template");
  assert.equal(calledWithoutKey, false);

  const badResponse = await route.POST(new Request("http://localhost/api/gesture-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedGestureLabel: "Help" })
  }));
  assert.equal(badResponse.status, 400);
} finally {
  globalThis.fetch = originalFetch;
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGeminiModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalGeminiModel;
}

console.log("Gesture feedback unit and mocked route checks passed.");
