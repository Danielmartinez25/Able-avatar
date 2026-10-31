import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  getPose,
  resolveExpression,
} from "../src/avatar/animationController.ts";
import { actionDetails, actionNames } from "../src/experience/performance.ts";

test("every choreography stays finite with positive scale across its entire duration", () => {
  for (const action of actionNames) {
    const duration = actionDetails[action].duration / 1000;
    for (let t = 0; t <= duration + 0.5; t += 1 / 60) {
      const pose = getPose("idle", t, false, action);
      assert.ok(
        Object.values(pose).every(Number.isFinite),
        `${action} at ${t}`,
      );
      assert.ok(pose.scaleX > 0 && pose.scaleY > 0);
    }
  }
});
test("jump has anticipation, visible flight and a neutral finish", () => {
  assert.ok(getPose("idle", 0.16, false, "jump").height < 0);
  assert.ok(getPose("idle", 0.725, false, "jump").height > 0.6);
  assert.ok(getPose("idle", 0.16, false, "jump").scaleY < 0.9);
  assert.deepEqual(
    getPose("idle", 2, false, "jump"),
    getPose("idle", 2, false),
  );
});
test("walking alternates feet and returns to its original position", () => {
  const pose = getPose("idle", 0.7, false, "walk");
  assert.ok(Math.abs(pose.x) > 0.4);
  assert.ok(pose.rightFoot * pose.leftFoot < 0);
  assert.equal(getPose("idle", 4.4, false, "walk").x, 0);
});
test("each gesture settles without a lingering arm pose or particles", () => {
  for (const name of ["wave", "wink", "celebrate"] as const) {
    const end = actionDetails[name].duration / 1000;
    assert.deepEqual(
      getPose("idle", end, false, name),
      getPose("idle", end, false),
    );
  }
});
test("reduced motion removes jumps, translation, breathing and continuous blinking", () => {
  for (const action of actionNames)
    for (const t of [0, 0.2, 0.7, 1.2, 3]) {
      const pose = getPose("idle", t, true, action);
      assert.equal(pose.height, 0);
      assert.equal(pose.x, 0);
      assert.equal(pose.scaleY, 1);
      assert.equal(pose.eyeHeight, 1);
      assert.equal(pose.sparkles, 0);
    }
});
test("actions temporarily override expressions without coupling to Able events", () => {
  assert.equal(resolveExpression("listening", "auto", null), "curious");
  assert.equal(
    resolveExpression("idle", "sleeping", "celebrate"),
    "celebrating",
  );
  assert.equal(resolveExpression("idle", "sleeping", null), "sleeping");
});

test("new scenes have differentiated body language and settle cleanly", () => {
  assert.ok(getPose("idle", 1, false, "search").rightArm > 0.8);
  assert.ok(getPose("idle", 1, false, "work").rightArmForward < -0.8);
  assert.ok(getPose("idle", 1.6, false, "idea").rightArm < -1.8);
  assert.ok(getPose("idle", 1, false, "organize").leftArmForward < -0.6);
  for (const name of ["search", "work", "idea", "organize"] as const) {
    const duration = actionDetails[name].duration / 1000;
    assert.deepEqual(
      getPose("idle", duration, false, name),
      getPose("idle", duration, false),
    );
  }
});
