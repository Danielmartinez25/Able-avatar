import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  initialSnapshot,
  visualStateReducer,
} from "../src/experience/visualStateReducer.ts";
import { visualStates } from "../src/experience/visualState.ts";

test("all six manual states can interrupt every other state", () => {
  for (const from of visualStates)
    for (const to of visualStates) {
      assert.equal(
        visualStateReducer(
          { state: from, revision: 4 },
          { type: "select", state: to },
        ).state,
        to,
      );
    }
});
test("an old completion cannot interrupt a newer selection or reset", () => {
  const greeting = visualStateReducer(initialSnapshot, {
    type: "select",
    state: "greeting",
  });
  const speaking = visualStateReducer(greeting, {
    type: "select",
    state: "speaking",
  });
  assert.equal(
    visualStateReducer(speaking, {
      type: "complete",
      revision: greeting.revision,
    }),
    speaking,
  );
  const reset = visualStateReducer(greeting, { type: "reset" });
  assert.equal(reset.state, "idle");
  assert.equal(
    visualStateReducer(reset, {
      type: "complete",
      revision: greeting.revision,
    }),
    reset,
  );
});
test("one-shots return to idle, persistent states do not", () => {
  for (const state of visualStates) {
    const current = { state, revision: 2 };
    const completed = visualStateReducer(current, {
      type: "complete",
      revision: 2,
    });
    assert.equal(
      completed.state,
      ["greeting", "farewell"].includes(state) ? "idle" : state,
    );
  }
});
