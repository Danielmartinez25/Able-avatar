import type { VisualState } from "../experience/visualState.ts";
import type { ActionName, Expression } from "../experience/performance.ts";
import { actionDetails } from "../experience/performance.ts";
import { getInteractionPose } from "./interactionMotion.ts";
import { getStoryPose, isNap, isFetch, storyExpression } from "./storyMotion.ts";
import { isAttention, getAttentionPose, attentionExpression } from "./attentionMotion.ts";
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const pulse = (t: number, a: number, b: number) =>
  Math.sin(clamp((t - a) / (b - a)) * Math.PI);

export function getActionEnvelope(
  action: ActionName,
  time: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) return 1;
  const duration = actionDetails[action].duration / 1000;
  return smooth(0, 0.28, time) * (1 - smooth(duration - 0.5, duration, time));
}

/** All choreography uses elapsed time since selection, never the global scene clock. */
export function getPose(
  state: VisualState,
  time: number,
  reducedMotion: boolean,
  action: ActionName | null = null,
  lifeTime = time,
) {
  if (!action) return getInteractionPose(state, time, reducedMotion, lifeTime);
  if (isAttention(action)) return getAttentionPose(action,Math.max(0,time),reducedMotion,lifeTime);
  if (isNap(action) || isFetch(action)) return getStoryPose(action, Math.max(0,time), reducedMotion, lifeTime);
  const t = Math.max(0, time);
  const pose = {
    x: 0,
    depth: 0,
    height: 0,
    tilt: 0,
    turn: -0.12,
    pitch: 0,
    scaleX: 1,
    scaleY: 1,
    rightArm: -0.28,
    leftArm: 0.28,
    rightArmForward: 0,
    leftArmForward: 0,
    rightFoot: 0,
    leftFoot: 0,
    eyeHeight: 1,
    eyeOffset: 0,
    mouthHeight: 1,
    sparkles: 0,
  };
  if (reducedMotion) {
    pose.tilt = state === "thinking" ? -0.14 : state === "listening" ? 0.1 : 0;
    if (action === "wave" || state === "greeting" || state === "farewell")
      pose.rightArm = -2.35;
    if (action === "celebrate") {
      pose.rightArm = -2.4;
      pose.leftArm = 2.4;
    }
    if (action === "search") {
      pose.rightArm = 1.1;
      pose.rightArmForward = -0.35;
      pose.tilt = -0.08;
    }
    if (action === "work") {
      pose.rightArmForward = -1;
      pose.leftArmForward = -1;
      pose.pitch = 0.12;
    }
    if (action === "idea") {
      pose.rightArm = -2.4;
      pose.tilt = 0.12;
    }
    if (action === "organize") {
      pose.rightArmForward = -0.8;
      pose.leftArmForward = -0.7;
    }
    return pose;
  }
  Object.assign(pose, getInteractionPose("idle", t, false, lifeTime));
  if (state === "listening") {
    pose.tilt += 0.13;
    pose.pitch = 0.06 + Math.sin(t * 2) * 0.035;
    pose.rightArm = -0.6;
    pose.leftArm = 0.48;
    pose.eyeOffset = 0.02;
  }
  if (state === "thinking") {
    pose.tilt -= 0.16;
    pose.turn = -0.3 + Math.sin(t * 1.4) * 0.12;
    pose.leftArm = 1.05;
    pose.leftArmForward = -1.1;
    pose.eyeOffset = 0.055;
  }
  if (state === "speaking") {
    pose.rightArm = -0.7 + Math.sin(t * 3.4) * 0.35;
    pose.leftArm = 0.65 + Math.sin(t * 3.4 + 1.7) * 0.32;
    pose.tilt += Math.sin(t * 3.4) * 0.055;
    pose.pitch = Math.sin(t * 4.2) * 0.055;
    pose.mouthHeight = 0.5 + (Math.sin(t * 11) * Math.sin(t * 3.7) + 1) * 0.65;
  }
  const clip =
    action ?? (state === "greeting" || state === "farewell" ? "wave" : null);
  if (!clip) return pose;
  const duration = actionDetails[clip].duration / 1000;
  const envelope = getActionEnvelope(clip, t, false);
  if (envelope === 0 && clip !== "appear") return pose;
  if (clip === "appear") {
    const arrival = smooth(0, 0.85, t);
    pose.scaleX *=
      0.05 +
      arrival * 0.95 +
      Math.sin(t * 12) * Math.exp(-t * 3) * arrival * 0.16;
    pose.scaleY *=
      0.05 +
      arrival * 0.95 -
      Math.sin(t * 12) * Math.exp(-t * 3) * arrival * 0.2;
    pose.height += Math.sin(t * 8) * Math.exp(-t * 2) * arrival * 0.2;
    pose.turn += (1 - arrival) * Math.PI * 1.4;
    pose.rightArm -= envelope * 1.3;
    pose.leftArm += envelope * 1.3;
  }
  if (clip === "wave") {
    pose.rightArm -= envelope * (2.1 + Math.sin(t * 12) * 0.32);
    pose.tilt += envelope * (0.1 + Math.sin(t * 6) * 0.04);
    pose.height += envelope * Math.abs(Math.sin(t * 3)) * 0.06;
    pose.leftArm += envelope * 0.14;
  }
  if (clip === "walk") {
    const phase = t * 11;
    pose.x = Math.sin((t / duration) * Math.PI * 2) * 0.65 * envelope;
    pose.turn += Math.cos((t / duration) * Math.PI * 2) * 0.5 * envelope;
    pose.height += Math.abs(Math.sin(phase)) * 0.09 * envelope;
    pose.tilt += Math.sin(phase) * 0.12 * envelope;
    pose.rightFoot = Math.sin(phase) * 0.48 * envelope;
    pose.leftFoot = -pose.rightFoot;
    pose.rightArmForward = -Math.sin(phase) * 0.55 * envelope;
    pose.leftArmForward = -pose.rightArmForward;
  }
  if (clip === "jump" || clip === "celebrate") {
    const jt = clip === "celebrate" ? t % 1.15 : t;
    const anticipation = pulse(jt, 0, 0.32),
      flight = pulse(jt, 0.32, 1.13),
      landing = pulse(jt, 1.13, 1.48);
    pose.height +=
      (flight * 0.68 - anticipation * 0.12 - landing * 0.07) * envelope;
    const squash =
      (anticipation * 0.21 + landing * 0.13 - flight * 0.08) * envelope;
    pose.scaleX *= 1 + squash * 0.65;
    pose.scaleY *= 1 - squash;
    pose.rightArm -=
      (flight * 1.8 + (clip === "celebrate" ? 0.8 : 0)) * envelope;
    pose.leftArm +=
      (flight * 1.8 + (clip === "celebrate" ? 0.8 : 0)) * envelope;
    pose.rightFoot = -flight * 0.3 * envelope;
    pose.leftFoot = flight * 0.3 * envelope;
    pose.tilt += Math.sin(t * 8) * 0.07 * envelope;
    if (clip === "celebrate") {
      pose.sparkles = envelope;
      pose.turn += Math.sin(t * 4) * 0.18 * envelope;
    }
  }
  if (clip === "wink") {
    pose.tilt += 0.18 * envelope;
    pose.rightArm -= 0.7 * envelope;
  }
  if (clip === "search") {
    pose.rightArm += (1.38 + Math.sin(t * 2.4) * 0.12) * envelope;
    pose.rightArmForward = -0.35 * envelope;
    pose.turn += Math.sin(t * 1.8) * 0.17 * envelope;
    pose.tilt -= 0.08 * envelope;
    pose.eyeOffset += Math.sin(t * 2.4) * 0.03 * envelope;
  }
  if (clip === "work") {
    pose.pitch += 0.12 * envelope;
    pose.rightArmForward = (-1.05 + Math.sin(t * 16) * 0.12) * envelope;
    pose.leftArmForward =
      (-1.05 + Math.sin(t * 16 + Math.PI) * 0.12) * envelope;
    pose.rightArm += 0.16 * envelope;
    pose.leftArm -= 0.16 * envelope;
    pose.tilt += Math.sin(t * 3) * 0.03 * envelope;
  }
  if (clip === "idea") {
    const discovery = smooth(0.7, 1.2, t) * envelope;
    pose.tilt += 0.12 * discovery;
    pose.rightArm -= 2.15 * discovery;
    pose.height += pulse(t, 1, 1.8) * 0.14 * envelope;
  }
  if (clip === "organize") {
    pose.rightArmForward = (-0.85 + Math.sin(t * 5) * 0.15) * envelope;
    pose.leftArmForward = -0.7 * envelope;
    pose.leftArm -= 0.2 * envelope;
    pose.pitch += Math.sin(t * 4) * 0.04 * envelope;
  }
  return pose;
}
export function resolveExpression(
  state: VisualState,
  expression: Expression,
  action: ActionName | null,
  time = 2,
): Exclude<Expression, "auto"> {
  const storyFace = storyExpression(action,time);
  if (storyFace) return storyFace;
  const attentionFace = attentionExpression(action,time);
  if (attentionFace) return attentionFace;
  if (action === "wink") return "wink";
  if (action === "celebrate") return "celebrating";
  if (action === "jump" || action === "appear") return "excited";
  if (action === "search") return "curious";
  if (action === "work" || action === "organize") return "focused";
  if (action === "idea") return "excited";
  if (expression !== "auto") return expression;
  if (state === "thinking") return "thinking";
  if (state === "listening") return "curious";
  return "happy";
}
