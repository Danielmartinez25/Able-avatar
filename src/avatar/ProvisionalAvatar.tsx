import { useContext, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, MeshPhysicalMaterial } from "three";
import type { Group } from "three";
import type { VisualState } from "../experience/visualState";
import type { ActionPlayback, Expression } from "../experience/performance";
import { getPose, resolveExpression } from "./animationController";
import {
  createBodyGeometry,
  createFurGeometry,
  createPlushTexture,
  createScreenGeometry,
} from "./characterGeometry";
import { Eye, Mouth, Stroke } from "./DigitalFace";
import { ExpressionAccents } from "./ExpressionAccents";
import { Magnifier, PerformanceProps, PropReveal } from "./PerformanceProps";
import { resolveAccent } from "../experience/visualAccents";
import { DocumentsProp } from "./DocumentsProp";
import { isFetch } from "./storyMotion";
import { AttentionEffects } from "./AttentionEffects";
import { mouthFromLevel, smoothSpeechLevel } from "../experience/speechLevel";
import { SpeechLevelContext } from "./speechContext";

const blue = "#039bff";
export function ProvisionalAvatar({
  state,
  revision,
  reducedMotion,
  expression,
  action,
  onReact,
}: {
  state: VisualState;
  revision: number;
  reducedMotion: boolean;
  expression: Expression;
  action: ActionPlayback;
  onReact: () => void;
}) {
  // Optional live voice level; without it speaking uses the local silent phrasing.
  const speech = useContext(SpeechLevelContext);
  const root = useRef<Group>(null),
    body = useRef<Group>(null),
    rightArm = useRef<Group>(null),
    leftArm = useRef<Group>(null);
  const rightFoot = useRef<Group>(null),
    leftFoot = useRef<Group>(null),
    eyes = useRef<Group>(null),
    mouth = useRef<Group>(null),
    sparks = useRef<Group>(null);
  const timer = useRef({
    stateRevision: -1,
    actionRevision: -1,
    stateStart: 0,
    actionStart: 0,
  });
  const assets = useMemo(() => {
    const geometry = createBodyGeometry(),
      texture = createPlushTexture();
    return {
      geometry,
      fur: createFurGeometry(geometry),
      screen: createScreenGeometry(),
      plush: new MeshPhysicalMaterial({
        color: "#fffaf0",
        roughness: 0.96,
        sheen: 1,
        sheenColor: "#fff7ed",
        sheenRoughness: 0.8,
        bumpMap: texture,
        bumpScale: 0.024,
      }),
    };
  }, []);
  const [timedFace, setTimedFace] = useState<{revision:number;expression:Exclude<Expression,"auto">}|null>(null);
  const face = timedFace?.revision === action.revision ? timedFace.expression : resolveExpression(state, expression, action.name, 0);
  useFrame(({ clock, pointer }, delta) => {
    if (
      !root.current ||
      !body.current ||
      !rightArm.current ||
      !leftArm.current ||
      !rightFoot.current ||
      !leftFoot.current ||
      !eyes.current ||
      !mouth.current ||
      !sparks.current
    )
      return;
    if (timer.current.stateRevision !== revision) {
      timer.current.stateRevision = revision;
      timer.current.stateStart = clock.elapsedTime;
    }
    if (timer.current.actionRevision !== action.revision) {
      timer.current.actionRevision = action.revision;
      timer.current.actionStart = clock.elapsedTime;
    }
    const time =
      clock.elapsedTime -
      (action.name ? timer.current.actionStart : timer.current.stateStart);
    const desiredFace = resolveExpression(state,expression,action.name,reducedMotion ? 2 : time);
    if(desiredFace !== face) setTimedFace({revision:action.revision,expression:desiredFace});
    const motionState =
      state === "idle" && (face === "thinking" || face === "doubtful")
        ? "thinking"
        : state;
    const pose = getPose(motionState, time, reducedMotion, action.name, clock.elapsedTime);
    if (!action.name && face === "sleeping") {
      pose.pitch = 0.18;
      pose.tilt = -0.1;
      pose.height -= 0.07;
      pose.scaleY *= 0.94;
    }
    if (!action.name && (face === "excited" || face === "celebrating")) {
      pose.rightArm = -2.1;
      pose.leftArm = 2.1;
      if (!reducedMotion && face === "celebrating") pose.sparkles = 0.75;
    }
    const follow = reducedMotion || face === "sleeping" || isFetch(action.name) ? 0 : 1;
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * (action.name ? 16 : 9));
    const eyeBlend = 1 - Math.exp(-Math.min(delta, 0.1) * 28);
    const lerp = (a: number, b: number) => MathUtils.lerp(a, b, blend);
    root.current.position.set(
      lerp(root.current.position.x, pose.x),
      lerp(root.current.position.y, 1.25 + pose.height),
      lerp(root.current.position.z, pose.depth),
    );
    body.current.rotation.set(
      lerp(body.current.rotation.x, pose.pitch),
      lerp(body.current.rotation.y, pose.turn + pointer.x * 0.13 * follow),
      lerp(body.current.rotation.z, pose.tilt),
    );
    body.current.scale.set(
      lerp(body.current.scale.x, pose.scaleX),
      lerp(body.current.scale.y, pose.scaleY),
      lerp(body.current.scale.z, pose.scaleX),
    );
    rightArm.current.rotation.z = lerp(
      rightArm.current.rotation.z,
      pose.rightArm,
    );
    leftArm.current.rotation.z = lerp(leftArm.current.rotation.z, pose.leftArm);
    rightArm.current.rotation.x = lerp(
      rightArm.current.rotation.x,
      pose.rightArmForward,
    );
    leftArm.current.rotation.x = lerp(
      leftArm.current.rotation.x,
      pose.leftArmForward,
    );
    rightFoot.current.rotation.x = lerp(
      rightFoot.current.rotation.x,
      pose.rightFoot,
    );
    leftFoot.current.rotation.x = lerp(
      leftFoot.current.rotation.x,
      pose.leftFoot,
    );
    eyes.current.scale.y = MathUtils.lerp(eyes.current.scale.y, pose.eyeHeight, eyeBlend);
    eyes.current.position.x = lerp(
      eyes.current.position.x,
      pointer.x * 0.035 * follow,
    );
    eyes.current.position.y = lerp(
      eyes.current.position.y,
      0.12 + pose.eyeOffset + pointer.y * 0.018 * follow,
    );
    if (speech) speech.smoothed = smoothSpeechLevel(speech.smoothed, speech.live ? speech.target : 0, delta);
    if (speech?.live && state === "speaking" && !action.name)
      mouth.current.scale.y = mouthFromLevel(speech.smoothed, clock.elapsedTime, speech.estimated);
    else mouth.current.scale.y = lerp(mouth.current.scale.y, pose.mouthHeight);
    sparks.current.scale.setScalar(pose.sparkles);
    sparks.current.rotation.y = time * 0.4;
  });
  const plushPart = (
    position: [number, number, number],
    scale: [number, number, number],
  ) => (
    <mesh position={position} scale={scale} material={assets.plush} castShadow>
      <sphereGeometry args={[1, 40, 28]} />
    </mesh>
  );
  return (
    <group
      ref={root}
      position={[0, 1.25, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onReact();
      }}
    >
      <group ref={body}>
        <mesh
          geometry={assets.geometry}
          material={assets.plush}
          castShadow
          receiveShadow
        />
        <lineSegments geometry={assets.fur}>
          <lineBasicMaterial color="#eee4d6" transparent opacity={0.32} />
        </lineSegments>
        <group position={[0, -0.03, 0.51]} rotation={[-0.025, 0, 0]}>
          <mesh
            geometry={assets.screen}
            scale={[1.045, 1.055, 1]}
            position={[0, 0, -0.012]}
          >
            <meshStandardMaterial
              color={blue}
              emissive={blue}
              emissiveIntensity={0.7}
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
          <mesh geometry={assets.screen}>
            <meshPhysicalMaterial
              color="#020916"
              metalness={0.45}
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>
          <group ref={eyes} position={[0, 0.12, 0.12]}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.275, 0, 0]}>
                <Eye expression={face} side={side} />
              </group>
            ))}
          </group>
          <group ref={mouth} position={[0, -0.08, 0.12]}>
            <Mouth expression={face} />
          </group>
          <mesh
            position={[0.3, 0.3, 0.112]}
            rotation={[0, 0, -0.45]}
            scale={[0.2, 0.015, 1]}
          >
            <circleGeometry args={[1, 32]} />
            <meshBasicMaterial color="#b6d9ff" transparent opacity={0.08} />
          </mesh>
        </group>
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[
              side * 0.39,
              0.6 + (face === "doubtful" && side === 1 ? 0.08 : 0),
              0.48,
            ]}
            rotation={[0, 0, side * -0.28]}
          >
            <Stroke
              points={[
                [-0.12, 0, 0],
                [0, 0.055, 0],
                [0.12, 0.005, 0],
              ]}
              radius={0.043}
              color="#171c28"
              glow={false}
            />
          </group>
        ))}
        <group ref={rightArm} position={[-0.72, -0.12, 0.35]}>
          {plushPart([0, -0.17, 0.02], [0.18, 0.28, 0.2])}
          {plushPart([0, -0.37, 0.22], [0.235, 0.23, 0.24])}
          {action.name === "search" && (
            <PropReveal action={action} reducedMotion={reducedMotion}>
              <Magnifier />
            </PropReveal>
          )}
        </group>
        <group ref={leftArm} position={[0.72, -0.12, 0.35]}>
          {plushPart([0, -0.17, 0.02], [0.18, 0.28, 0.2])}
          {plushPart([0, -0.37, 0.22], [0.235, 0.23, 0.24])}
        </group>
        {[
          { side: -1, ref: rightFoot },
          { side: 1, ref: leftFoot },
        ].map(({ side, ref }) => (
          <group key={side} ref={ref} position={[side * 0.61, -0.86, 0.18]}>
            <mesh scale={[0.32, 0.2, 0.37]} castShadow>
              <sphereGeometry args={[1, 40, 24]} />
              <meshPhysicalMaterial
                color="#07172d"
                metalness={0.45}
                roughness={0.23}
                clearcoat={1}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.17, 1]}>
              <torusGeometry args={[0.303, 0.014, 8, 48]} />
              <meshStandardMaterial
                color="#77dbff"
                emissive={blue}
                emissiveIntensity={2.5}
              />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.94, -0.25, -0.06]}
            rotation={[0, (side * Math.PI) / 2, 0]}
          >
            <Stroke
              points={[
                [0, -0.35, 0],
                [-0.12, -0.18, 0],
                [-0.16, 0.05, 0],
                [-0.08, 0.28, 0],
              ]}
              radius={0.025}
            />
          </group>
        ))}
        <group position={[0.63, -0.47, 0.52]} rotation={[0, 0.15, -0.15]}>
          {[-1, 1].map((sign) => (
            <mesh key={sign} rotation={[0, 0, (sign * Math.PI) / 4]}>
              <capsuleGeometry args={[0.035, 0.26, 6, 12]} />
              <meshStandardMaterial color="#149fe9" roughness={0.5} />
            </mesh>
          ))}
        </group>
        <PerformanceProps action={action} reducedMotion={reducedMotion} />
        <DocumentsProp action={action} reducedMotion={reducedMotion} />
      </group>
      <ExpressionAccents
        kind={resolveAccent(face, action.name)}
        reducedMotion={reducedMotion}
      />
      <AttentionEffects action={action} reducedMotion={reducedMotion} />
      <group ref={sparks} scale={0}>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 2.4) * (1.3 + (i % 2) * 0.2),
              0.3 + (i % 4) * 0.36,
              Math.sin(i * 2.4) * 0.7,
            ]}
            rotation={[0.2, i, Math.PI / 4]}
          >
            <octahedronGeometry args={[0.045 + (i % 2) * 0.018]} />
            <meshBasicMaterial color={i % 3 ? "#21b7ff" : "#a5e5ff"} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
