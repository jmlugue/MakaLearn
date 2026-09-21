import assert from "node:assert/strict";
import test from "node:test";
import {
  completeGestureCapture,
  createGestureCaptureState,
  getGestureCandidateCheckStep,
  observeGestureCandidate,
  shouldUseReservedGesture,
  takeRecentGestureWindow
} from "../src/utils/gesture-capture-state.ts";

const candidate = (label, confidence, snapshot, handCount = 1) => ({
  label,
  confidence,
  payload: { snapshot, handCount }
});

test("one noisy prediction cannot identify A or B", () => {
  let state = createGestureCaptureState();
  state = observeGestureCandidate(state, candidate("Yes", 82, "yes-1"));
  state = observeGestureCandidate(state, candidate("No", 91, "no-noise"));
  state = observeGestureCandidate(state, candidate("Yes", 84, "yes-2"));
  assert.equal(state.phase, "normal-capture");
  assert.equal(state.reservedA, null);
  assert.equal(state.ignoredBLabel, null);
});

test("candidate checks overlap and frozen windows exclude earlier gesture frames", () => {
  assert.equal(getGestureCandidateCheckStep(12), 3);
  assert.deepEqual(
    takeRecentGestureWindow(
      ["no-1", "no-2", "no-3", "yes-1", "yes-2"],
      2
    ),
    ["yes-1", "yes-2"]
  );
});

test("an uncertain check does not erase a matching candidate streak", () => {
  let state = createGestureCaptureState();
  state = observeGestureCandidate(state, candidate("No", 74, "no-1"));
  state = observeGestureCandidate(state, null);
  state = observeGestureCandidate(state, candidate("No", 78, "no-2"));
  assert.equal(state.phase, "reserved-a");
  assert.equal(state.reservedA?.label, "No");
});

test("A keeps its best snapshot and B freezes it", () => {
  let state = createGestureCaptureState();
  state = observeGestureCandidate(state, candidate("Help", 68, "help-best", 2));
  state = observeGestureCandidate(state, candidate("Help", 63, "help-later", 2));
  assert.equal(state.phase, "reserved-a");
  assert.equal(state.reservedA?.payload.snapshot, "help-best");

  state = observeGestureCandidate(state, candidate("Help", 72, "help-improved", 2));
  state = observeGestureCandidate(state, candidate("No", 93, "no-1"));
  state = observeGestureCandidate(state, candidate("No", 95, "no-2"));
  const ignored = observeGestureCandidate(state, candidate("Sit down", 99, "later", 2));
  assert.equal(ignored.phase, "ignoring-b");
  assert.equal(ignored.ignoredBLabel, "No");
  assert.equal(ignored.reservedA?.payload.snapshot, "help-improved");
  assert.equal(shouldUseReservedGesture(ignored), true);
});

test("low-confidence A wins over confident B through completion", () => {
  let state = createGestureCaptureState();
  for (const next of [
    candidate("Yes", 62, "yes-1"),
    candidate("Yes", 65, "yes-2"),
    candidate("No", 96, "no-1"),
    candidate("No", 98, "no-2")
  ]) {
    state = observeGestureCandidate(state, next);
  }
  state = completeGestureCapture(state);
  assert.equal(state.phase, "completed");
  assert.equal(state.reservedA?.label, "Yes");
  assert.equal(state.reservedA?.confidence, 65);
  assert.equal(shouldUseReservedGesture(state), true);
  assert.equal(shouldUseReservedGesture(createGestureCaptureState()), false);
});

test("all seven labels survive one-hand and two-hand transitions as A", () => {
  const gestures = [
    ["I want to drink water", 1],
    ["I want to eat food", 1],
    ["Help", 2],
    ["No", 1],
    ["Sit down", 2],
    ["I want to go to toilet", 1],
    ["Yes", 1]
  ];
  gestures.forEach(([label, handCount], index) => {
    const [nextLabel, nextHandCount] = gestures[(index + 1) % gestures.length];
    let state = createGestureCaptureState();
    for (const next of [
      candidate(label, 75, "a-1", handCount),
      candidate(label, 77, "a-2", handCount),
      candidate(nextLabel, 88, "b-1", nextHandCount),
      candidate(nextLabel, 90, "b-2", nextHandCount)
    ]) {
      state = observeGestureCandidate(state, next);
    }
    assert.equal(state.reservedA?.label, label);
    assert.equal(state.reservedA?.payload.handCount, handCount);
    assert.equal(state.ignoredBLabel, nextLabel);
  });
});
