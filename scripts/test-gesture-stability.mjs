import assert from "node:assert/strict";
import test from "node:test";
import {
  getHandPoseDistance,
  PREDICTED_POSE_REARM_DISTANCE,
  STABLE_POSE_MOVEMENT_TOLERANCE
} from "../src/utils/gesture-stability.ts";

const oneHandGestures = ["Drink", "Eat", "No", "Toilet", "Yes"];
const twoHandGestures = ["Help", "Sit down"];

test("normal tracker jitter stays inside the stable-pose tolerance for every gesture", () => {
  for (const label of oneHandGestures) {
    const reference = [createHand(0.35, 0.6)];
    const jittered = [createHand(0.35, 0.6, { pointIndex: 8, xOffset: 0.04 })];
    assert.ok(
      getHandPoseDistance(reference, jittered) < STABLE_POSE_MOVEMENT_TOLERANCE,
      `${label} should remain stable when one fingertip jitters`
    );
  }

  for (const label of twoHandGestures) {
    const reference = [createHand(0.3, 0.6), createHand(0.65, 0.6)];
    const jittered = [
      createHand(0.3, 0.6, { pointIndex: 8, xOffset: 0.04 }),
      createHand(0.65, 0.6, { pointIndex: 20, yOffset: -0.04 })
    ];
    assert.ok(
      getHandPoseDistance(reference, jittered) < STABLE_POSE_MOVEMENT_TOLERANCE,
      `${label} should remain stable when landmarks on both hands jitter`
    );
  }
});

test("intentional movement resets capture and can re-arm after a completed prediction", () => {
  const reference = [createHand(0.35, 0.6)];
  const moved = [createHand(0.4, 0.6)];
  const distance = getHandPoseDistance(reference, moved);

  assert.ok(distance > STABLE_POSE_MOVEMENT_TOLERANCE);
  assert.ok(distance > PREDICTED_POSE_REARM_DISTANCE);
});

test("a changing hand count is never treated as a stable pose", () => {
  const oneHand = [createHand(0.35, 0.6)];
  const twoHands = [createHand(0.35, 0.6), createHand(0.65, 0.6)];
  assert.equal(getHandPoseDistance(oneHand, twoHands), Number.POSITIVE_INFINITY);
});

function createHand(wristX, wristY, jitter) {
  return Array.from({ length: 21 }, (_, index) => {
    const column = (index % 4) - 1.5;
    const row = Math.floor(index / 4);
    const point = {
      x: wristX + column * 0.018,
      y: wristY - row * 0.022,
      z: 0
    };

    if (index === 0) {
      point.x = wristX;
      point.y = wristY;
    }
    if (index === 9) {
      point.x = wristX;
      point.y = wristY - 0.1;
    }
    if (jitter?.pointIndex === index) {
      point.x += jitter.xOffset ?? 0;
      point.y += jitter.yOffset ?? 0;
    }
    return point;
  });
}
