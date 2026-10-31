import type { VisualState } from "../experience/visualState.ts";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a));
  return x * x * x * (10 + x * (-15 + 6 * x));
};
const beat = (a: number, b: number, t: number) =>
  t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) ** 2 : 0;

/** Continuous life clock is independent of state selection and one-shot timing. */
export function getInteractionPose(state: VisualState, elapsed: number, reduced: boolean, life = elapsed) {
  const t = Math.max(0, elapsed), clock = Math.max(0, life);
  const pose = {
    x: 0, depth: 0, height: 0, tilt: 0, turn: -0.12, pitch: 0,
    scaleX: 1, scaleY: 1, rightArm: -0.28, leftArm: 0.28,
    rightArmForward: 0, leftArmForward: 0, rightFoot: 0, leftFoot: 0,
    eyeHeight: 1, eyeOffset: 0, mouthHeight: 1, sparkles: 0,
  };
  if (reduced) {
    if (state === "greeting" || state === "farewell") pose.rightArm = -2.1;
    if (state === "listening") { pose.tilt = .09; pose.pitch = .055; pose.rightArm = -.48; }
    if (state === "thinking") { pose.tilt = -.13; pose.leftArm = 1; pose.leftArmForward = -.95; pose.eyeOffset = .045; }
    if (state === "speaking") { pose.rightArm = -.62; pose.leftArm = .48; }
    return pose;
  }
  const breath = Math.sin(clock * 1.85) * .8 + Math.sin(clock * .73) * .2;
  pose.height = .009 * breath;
  pose.scaleX = 1 - .006 * breath;
  pose.scaleY = 1 + .01 * breath;
  pose.tilt = .018 * Math.sin(clock * .86) + .007 * Math.sin(clock * 1.43);
  pose.rightArmForward = .035 * Math.sin(clock * 1.85 - .4);
  pose.leftArmForward = .028 * Math.sin(clock * 1.85 - .85);
  // A long blink cycle with a single, double, then single blink.
  const blinkTime = clock % 17.3;
  const blink = Math.max(beat(3.8,4.03,blinkTime), beat(9.1,9.33,blinkTime), beat(9.49,9.69,blinkTime), beat(14.6,14.84,blinkTime));
  pose.eyeHeight = 1 - .95 * blink;
  const enter = ease(0,.65,t);
  if (state === "idle") {
    const curious = beat(6.4,9,clock % 19.7);
    pose.tilt += .065 * curious;
    pose.pitch -= .025 * curious;
    pose.leftArm += .10 * beat(6.7,9.3,clock % 19.7);
  }
  if (state === "listening") {
    // Attention arrives first; occasional acknowledgement nods leave quiet pauses.
    const phase = t % 8.7;
    const nod = beat(1.8,2.4,phase) + .55 * beat(2.5,3.05,phase) + .65 * beat(6.1,6.8,phase);
    pose.tilt += enter * (.10 + .018 * Math.sin(t * .8));
    pose.pitch = enter * (.045 + .07 * nod);
    pose.rightArm -= .23 * enter;
    pose.leftArm += .13 * enter;
    pose.rightArmForward -= .07 * enter;
    pose.eyeOffset = .018 * enter;
  }
  if (state === "thinking") {
    const phase = t % 10.1;
    const insight = beat(5.5,7.3,phase);
    pose.tilt -= enter * (.14 - .065 * insight);
    pose.turn -= enter * (.10 + .035 * Math.sin(t * .9));
    pose.pitch -= .025 * enter;
    pose.leftArm += 1.27 * ease(.14,.95,t);
    pose.leftArmForward -= .98 * ease(.25,1.1,t);
    pose.rightArm -= .08 * enter;
    pose.eyeOffset = enter * (.045 + .018 * beat(2.2,4.4,phase));
    pose.leftArmForward += .045 * Math.sin(t * 1.7) * enter;
  }
  if (state === "speaking") {
    // Local silent demonstration: phrasing and pauses, never inferred from audio.
    const phase = t % 7.6;
    const phrase = Math.max(beat(.12,2.1,phase), .8 * beat(2.6,4.25,phase), .95 * beat(4.8,6.95,phase));
    pose.rightArm -= enter * (.18 + .55 * phrase);
    pose.leftArm += enter * (.12 + .39 * beat(.45,2.5,phase) + .5 * beat(4.98,7.2,phase));
    pose.rightArmForward -= .18 * phrase;
    pose.leftArmForward -= .14 * beat(2.75,4.6,phase);
    pose.tilt += .045 * Math.sin(t * 1.8) * phrase;
    pose.pitch = .035 * beat(.45,1.1,phase) + .045 * beat(5.25,5.95,phase);
    pose.mouthHeight = 1 + phrase * (.22 + .5 * Math.sin(t * 9.8) ** 2);
  }
  if (state === "greeting" || state === "farewell") {
    const goodbye = state === "farewell";
    const prepare = beat(.12,.62,t);
    const lift = ease(.4,1.02,t) * (1-ease(2.35,3.25,t));
    const wave = (beat(1.04,1.54,t) - .8 * beat(1.54,1.98,t) + .85 * beat(1.98,2.38,t));
    const settle = beat(2.6,3.35,t);
    pose.rightArm += .16 * prepare - (goodbye ? 1.85 : 2.05) * lift - (goodbye ? .22 : .33) * wave;
    pose.rightArmForward -= .15 * beat(.6,2.9,t);
    pose.leftArm += (goodbye ? .12 : .25) * beat(.65,2.85,t);
    pose.leftArmForward -= .07 * beat(.85,3.1,t);
    pose.tilt += .08 * lift + .024 * wave - .025 * settle;
    pose.pitch += (goodbye ? .065 * beat(1.85,2.75,t) : -.035 * lift);
    pose.turn += (goodbye ? -.07 : .045) * lift;
    const squash = -.045 * prepare + .025 * beat(.65,1.2,t) - .014 * settle;
    pose.scaleY += squash;
    pose.scaleX -= .45 * squash;
    pose.height += (goodbye ? .012 : .03) * beat(.7,2.55,t);
  }
  return pose;
}
