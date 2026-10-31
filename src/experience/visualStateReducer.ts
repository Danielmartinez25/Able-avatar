import { visualStates } from "./visualState.ts";
import type { VisualState } from "./visualState.ts";

export type VisualSnapshot = { state: VisualState; revision: number };
export type VisualAction =
  | { type: "select"; state: VisualState }
  | { type: "complete"; revision: number }
  | { type: "reset" };

export const initialSnapshot: VisualSnapshot = { state: "idle", revision: 0 };

export function visualStateReducer(
  current: VisualSnapshot,
  action: VisualAction,
): VisualSnapshot {
  if (action.type === "complete") {
    if (
      action.revision !== current.revision ||
      !["greeting", "farewell"].includes(current.state)
    )
      return current;
    return { state: "idle", revision: current.revision + 1 };
  }
  if (action.type === "reset")
    return { state: "idle", revision: current.revision + 1 };
  if (!visualStates.includes(action.state)) return current;
  return { state: action.state, revision: current.revision + 1 };
}
