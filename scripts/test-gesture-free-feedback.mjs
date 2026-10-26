import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";

const ts = createRequire(import.meta.url)("typescript");
const source = readFileSync(new URL("../src/features/gesture/gesture-practice-view.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("gesture-practice-view.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "GesturePracticeView");
const names = ["clearCorrectiveFeedback", "updateLiveModelCapture", "updateCompletedGesturePrediction", "requestCorrectiveFeedback"];
// Execute the actual capture/feedback functions with controlled camera and network
// dependencies, including deferred responses that could restore obsolete feedback.
const functions = names.map((name) => {
  const declaration = component.body.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, `Missing component function ${name}`);
  return declaration.getText(ast);
}).join("\n");
const compiled = ts.transpileModule(`${functions}\n({${names.join(",")}})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
}).outputText;

function fixture(mode = "free") {
  const state = { feedback: { learnerMessage: "Old correction" }, loading: true, prediction: null, guidedCalls: 0 };
  const noop = () => {};
  const ref = (current) => ({ current });
  const context = {
    performance: { now: () => 1000 },
    feedbackRequestIdRef: ref(1),
    practiceModeRef: ref(mode),
    lastHandsSeenAtRef: ref(0),
    consecutiveGestureLockRef: ref(false),
    pendingModelPredictionRef: ref(false),
    waitingForPoseChangeRef: ref(false),
    predictedPoseAnchorRef: ref(null),
    gestureCaptureActiveRef: ref(false),
    liveGestureFramesRef: ref([]),
    liveGestureHandFramesRef: ref([]),
    stablePoseStartedAtRef: ref(0),
    stablePoseAnchorRef: ref(null),
    stableStatusStepRef: ref(0),
    predictionCandidateRef: ref(null),
    currentPredictionLabelRef: ref(null),
    PREDICTED_POSE_REARM_DISTANCE: 0.3,
    STABLE_POSE_MOVEMENT_TOLERANCE: 0.16,
    STABLE_POSE_AUTO_PREDICT_DELAY_MS: 2000,
    NO_HANDS_AUTO_PREDICT_DELAY_MS: 500,
    detectedHandCount: 1,
    selectedGesture: { label: "Help" },
    copyHands: (hands) => hands,
    getHandPoseDistance: () => 0,
    copyGestureFrame: (hands, handedness) => ({ hands, handedness }),
    clearPrediction: () => { state.prediction = null; },
    setPrediction: (value) => { state.prediction = value; },
    setCorrectiveFeedback: (value) => { state.feedback = value; },
    setFeedbackLoading: (value) => { state.loading = value; },
    handleGuidedPrediction: () => { state.guidedCalls += 1; },
    resetConsecutiveGestureCapture: noop,
    resetLiveGestureBuffer: (frames) => { frames.length = 0; },
    appendLiveGestureFrame: noop,
    checkLiveGestureCandidate: noop,
    setStatusMessage: noop,
    setModelStatus: noop,
    resetStablePoseTracking: noop,
    completeLiveGestureCapture: noop,
    getExpectedGestureHandCount: () => 2,
    buildGestureFeedbackRequest: (request) => request,
    createTemplateGestureFeedback: () => ({ learnerMessage: "Fallback", teacherNote: "Fallback note" })
  };
  const api = runInNewContext(compiled, context);
  return { state, context, api };
}

const hands = [[{ x: 0.5, y: 0.5, z: 0 }]];

test("free feedback clears when hands return and when a held pose changes", () => {
  for (const changedPose of [false, true]) {
    const { state, context, api } = fixture();
    context.waitingForPoseChangeRef.current = changedPose;
    context.getHandPoseDistance = () => changedPose ? 0.4 : 0;
    api.updateLiveModelCapture(hands, []);
    assert.equal(state.feedback, null);
    assert.equal(state.loading, false);
    assert.equal(context.feedbackRequestIdRef.current, 2);
    assert.equal(context.gestureCaptureActiveRef.current, true);
  }
});

test("holding the completed pose or keeping hands down preserves feedback", () => {
  for (const visible of [false, true]) {
    const { state, context, api } = fixture();
    context.waitingForPoseChangeRef.current = visible;
    api.updateLiveModelCapture(visible ? hands : [], []);
    assert.equal(state.feedback.learnerMessage, "Old correction");
    assert.equal(context.feedbackRequestIdRef.current, 1);
  }
});

test("free success clears old correction; guided capture/result handling stays separate", () => {
  const free = fixture();
  const prediction = { label: "Yes", matchPercent: 94 };
  free.api.updateCompletedGesturePrediction(prediction);
  assert.equal(free.state.feedback, null);
  assert.equal(free.state.loading, false);
  assert.equal(free.state.prediction, prediction);
  const guided = fixture("guided");
  guided.api.updateLiveModelCapture(hands, []);
  guided.api.updateCompletedGesturePrediction(prediction);
  assert.equal(guided.state.feedback.learnerMessage, "Old correction");
  assert.equal(guided.context.feedbackRequestIdRef.current, 1);
  assert.equal(guided.state.guidedCalls, 1);
});

test("late feedback and fallback cannot reappear after a new capture or success", async () => {
  for (const success of [false, true]) {
    for (const failed of [false, true]) {
      const { state, context, api } = fixture();
      let finish;
      context.fetch = () => new Promise((resolve, reject) => {
        finish = () => failed ? reject(new Error("Network failure")) : resolve({
          ok: true,
          json: async () => ({ learnerMessage: "Late correction", teacherNote: "Late note" })
        });
      });
      const pending = api.requestCorrectiveFeedback(null, 2, "hands-visible");
      assert.equal(state.loading, true);
      if (success) api.updateCompletedGesturePrediction({ label: "Yes" });
      else api.updateLiveModelCapture(hands, []);
      finish();
      await pending;
      assert.equal(state.feedback, null);
      assert.equal(state.loading, false);
    }
  }
});

test("a newly completed wrong attempt can display its own feedback", async () => {
  const { state, context, api } = fixture();
  api.updateLiveModelCapture(hands, []);
  context.fetch = async () => ({ ok: true, json: async () => ({ learnerMessage: "New correction", teacherNote: "New note" }) });
  // Capture the request promise while exercising the actual completion branch.
  let pending;
  context.requestCorrectiveFeedback = (...args) => (pending = api.requestCorrectiveFeedback(...args));
  api.updateCompletedGesturePrediction(null);
  await pending;
  assert.equal(state.feedback.learnerMessage, "New correction");
  assert.equal(state.loading, false);
});
