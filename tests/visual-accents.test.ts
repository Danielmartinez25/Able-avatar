import { test } from "node:test";
import { strict as assert } from "node:assert";
import { resolveAccent } from "../src/experience/visualAccents.ts";
import {
  resolveExpression,
  getActionEnvelope,
} from "../src/avatar/animationController.ts";
import { actionNames, actionDetails } from "../src/experience/performance.ts";

test("sleeping Zs are replaced by the selected expression or action accent", () => {
  assert.equal(resolveAccent("sleeping", null), "sleep");
  assert.equal(resolveAccent("doubtful", null), "question");
  assert.equal(resolveAccent("thinking", null), "thought");
  assert.equal(resolveAccent("happy", null), "joy");
  assert.equal(
    resolveAccent(resolveExpression("idle", "sleeping", "work"), "work"),
    "thought",
  );
  assert.equal(
    resolveAccent(
      resolveExpression("idle", "sleeping", "celebrate"),
      "celebrate",
    ),
    "none",
  );
});

test("props reveal smoothly, exit before completion and remain static with reduced motion", () => {
  for (const action of actionNames) {
    const duration = actionDetails[action].duration / 1000;
    assert.equal(getActionEnvelope(action, 0, false), 0);
    assert.equal(getActionEnvelope(action, 0.5, false), 1);
    assert.equal(getActionEnvelope(action, duration, false), 0);
    assert.ok(getActionEnvelope(action, duration - 0.25, false) < 1);
    assert.equal(getActionEnvelope(action, 0, true), 1);
    assert.equal(getActionEnvelope(action, duration / 2, true), 1);
  }
});
