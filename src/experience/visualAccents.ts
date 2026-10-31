import type { ActionName, Expression } from "./performance.ts";

export type AccentKind =
  | "sleep"
  | "question"
  | "thought"
  | "surprise"
  | "joy"
  | "sparkle"
  | "focus"
  | "rays"
  | "check"
  | "none";
const expressionAccents: Record<Exclude<Expression, "auto">, AccentKind> = {
  happy: "joy",
  surprised: "surprise",
  wink: "sparkle",
  excited: "rays",
  thinking: "thought",
  curious: "question",
  doubtful: "question",
  focused: "focus",
  sleeping: "sleep",
  celebrating: "none",
};
export function resolveAccent(
  expression: Exclude<Expression, "auto">,
  action: ActionName | null,
): AccentKind {
  if (action === "work" || action === "search") return "thought";
  if (action === "organize") return "check";
  return expressionAccents[expression];
}
